import os
import base64
from datetime import datetime, timezone
from typing import Optional, List
import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.messages import HumanMessage
from bson import ObjectId

from auth import get_current_user
from models import MedicationCreate, MedicationInDB, MedicationResponse, GenerateScheduleRequest, GeneratedMasterSchedule, SchedulePersistRequest, ScheduleResponse, DailyActionPlanEntry
from database import medication_collection, schedule_collection, action_plan_collection
from scheduler import send_discord_reminder

router = APIRouter(prefix="/medications", tags=["medications"])

async def fetch_drug_info_from_fda(drug_name: str) -> Optional[dict]:
    """
    Queries openFDA API for drug label information.
    Attempts exact brand/generic name match first, and falls back to prefix/wildcard matching.
    """
    if not drug_name:
        return None

    clean_name = drug_name.strip()
    search_query = f'openfda.brand_name:"{clean_name}" OR openfda.generic_name:"{clean_name}"'
    url = "https://api.fda.gov/drug/label.json"
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(url, params={"search": search_query, "limit": 1})
            if response.status_code == 200:
                data = response.json()
                if "results" in data and len(data["results"]) > 0:
                    return data["results"][0]
            
            # Fallback 1: Prefix search
            fallback_query = f'openfda.brand_name:{clean_name}* OR openfda.generic_name:{clean_name}*'
            response = await client.get(url, params={"search": fallback_query, "limit": 1})
            if response.status_code == 200:
                data = response.json()
                if "results" in data and len(data["results"]) > 0:
                    return data["results"][0]
        except Exception as e:
            print(f"Error querying openFDA API for '{drug_name}': {e}")
    
    return None

@router.post("/", response_model=MedicationResponse)
async def create_medication(
    medication: MedicationCreate,
    current_user: dict = Depends(get_current_user)
):
    api_key = os.getenv("GEMINI_API_KEY")
    vector = None
    if api_key:
        try:
            embeddings_model = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001", google_api_key=api_key)
            embedding_text = f"Medication: {medication.name}. Purpose: {medication.purpose}."
            vector = embeddings_model.embed_query(embedding_text)
        except Exception as e:
            print(f"Failed to generate embedding: {e}")

    now = datetime.now(timezone.utc)
    med_db = MedicationInDB(
        **medication.model_dump(),
        _id=str(ObjectId()),
        username=current_user["username"],
        embedding=vector,
        created_at=now,
        updated_at=now
    )

    await medication_collection.insert_one(med_db.model_dump(by_alias=True))

    return MedicationResponse(
        **medication.model_dump(),
        id=med_db.id,
        created_at=med_db.created_at
    )

@router.get("/", response_model=List[MedicationResponse])
async def list_medications(current_user: dict = Depends(get_current_user)):
    meds_cursor = medication_collection.find({"username": current_user["username"]})
    meds = await meds_cursor.to_list(length=100)
    
    response_meds = []
    for m in meds:
        m_id = str(m.get("_id"))
        response_meds.append(MedicationResponse(**m, id=m_id))
    return response_meds

@router.delete("/{med_id}")
async def delete_medication(med_id: str, current_user: dict = Depends(get_current_user)):
    result = await medication_collection.delete_one({
        "_id": med_id,
        "username": current_user["username"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Medication not found")
    return {"status": "success", "message": "Medication deleted successfully"}

@router.post("/schedule/generate", response_model=GeneratedMasterSchedule)
async def generate_master_schedule(
    request: GenerateScheduleRequest,
    current_user: dict = Depends(get_current_user)
):
    if not request.medication_ids:
        raise HTTPException(status_code=400, detail="Must provide at least one medication ID")

    # Fetch all selected medications for the current user
    meds_cursor = medication_collection.find({
        "_id": {"$in": request.medication_ids},
        "username": current_user["username"]
    })
    meds = await meds_cursor.to_list(length=100)

    if not meds:
        raise HTTPException(status_code=404, detail="No matching medications found for this user")

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured")

    llm = ChatGoogleGenerativeAI(
        model="gemini-3.1-flash-lite", # Using 1.5 Pro for complex reasoning and scheduling
        google_api_key=api_key,
        temperature=0.1
    )

    structured_llm = llm.with_structured_output(GeneratedMasterSchedule)

    # Format the medications into a readable list for the prompt
    meds_text = ""
    for m in meds:
        meds_text += f"- {m['name']} (Type: {m['type']}, Dosage: {m['dosage']}, Freq: {m['frequency']}, With Food: {m['with_food']}, Interactions: {m.get('interactions_to_avoid', [])})\n"

    prompt_text = (
        "You are an expert pharmacist creating a highly optimized, safe daily schedule for a patient. "
        "The patient is taking the following list of medications/supplements:\n"
        f"{meds_text}\n"
        "Here is the patient's daily routine schedule:\n"
        f"- Wake-up time: {request.wake_time}\n"
        f"- Sleep time: {request.sleep_time}\n"
        f"- Breakfast time: {request.breakfast_time}\n"
        f"- Lunch time: {request.lunch_time}\n"
        f"- Dinner time: {request.dinner_time}\n"
    )
    if request.routine_notes:
        prompt_text += f"- Daily routine notes/preferences: {request.routine_notes}\n"

    prompt_text += (
        "\nYour task is to organize these medications into chronological daily time slots (in HH:MM 24-hour format).\n"
        "CRITICAL SAFETY & ROUTINE COMPLIANCE RULES:\n"
        "1. Avoid drug-drug interactions: Identify medications that have known negative interactions or shouldn't be taken together. Separate their administration times (e.g., by at least 2-4 hours, or as clinically recommended).\n"
        "2. Align with meals and routine: If a medication should be taken with food (with_food is True or indicated in frequency/instructions), schedule it at/near the patient's breakfast, lunch, or dinner time. If it must be taken on an empty stomach, schedule it at a suitable time away from meals (e.g. upon waking up, or at bedtime).\n"
        "3. Respect wake/sleep times: Do not schedule medication when the patient is asleep unless absolutely required, in which case add a warning. Fit all doses between their wake time and sleep time.\n"
        "4. Address any routine notes/preferences specified by the patient.\n"
        "5. For each time slot (ScheduleTimeSlot), provide the exact 24-hour time ('HH:MM'), the list of medication names to take, clear instructions, and any relevant interaction warnings or explanations for why certain medications are scheduled/separated.\n"
        "6. Provide overall medical advice in the 'general_advice' field summarizing the schedule structure, drug interaction checking results, and key recommendations."
    )

    try:
        schedule: GeneratedMasterSchedule = structured_llm.invoke([
            HumanMessage(content=prompt_text)
        ])
        return schedule
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate schedule: {str(e)}")

@router.post("/schedule", response_model=ScheduleResponse)
async def save_user_schedule(
    request: SchedulePersistRequest,
    current_user: dict = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    await schedule_collection.update_one(
        {"username": current_user["username"]},
        {
            "$set": {
                "slots": [slot.model_dump() for slot in request.slots],
                "general_advice": request.general_advice,
                "updated_at": now
            }
        },
        upsert=True
    )
    return ScheduleResponse(
        slots=request.slots,
        general_advice=request.general_advice,
        updated_at=now
    )

@router.get("/schedule", response_model=ScheduleResponse)
async def get_user_schedule(
    current_user: dict = Depends(get_current_user)
):
    schedule = await schedule_collection.find_one({"username": current_user["username"]})
    if not schedule:
        raise HTTPException(status_code=404, detail="No persisted schedule found")
    return ScheduleResponse(
        slots=schedule["slots"],
        general_advice=schedule["general_advice"],
        updated_at=schedule["updated_at"]
    )

@router.post("/schedule/demo-reminder")
async def trigger_demo_reminder(
    current_user: dict = Depends(get_current_user)
):
    schedule = await schedule_collection.find_one({"username": current_user["username"]})
    if schedule and schedule.get("slots"):
        slot = schedule["slots"][0]
    else:
        slot = {
            "time": "08:00",
            "medication_names": ["Test Medication 10mg", "Supplement 500mg"],
            "instructions": "Take with breakfast.",
            "interaction_warnings": "This is a demonstration reminder."
        }
    await send_discord_reminder(current_user["username"], slot)
    return {"status": "success", "message": "Demo reminder sent!"}

@router.post("/scan", response_model=MedicationResponse)
async def scan_medication(
    image: UploadFile = File(None),
    audio: UploadFile = File(None),
    drug_name: str = Form(None),
    current_user: dict = Depends(get_current_user)
):
    if not image and not drug_name and not audio:
        raise HTTPException(status_code=400, detail="Must provide an image, audio, or a drug_name")

    # Fetch user's existing medications for interaction check comparison
    existing_meds_cursor = medication_collection.find({"username": current_user["username"]})
    existing_meds = await existing_meds_cursor.to_list(length=100)
    existing_meds_context = ""
    if existing_meds:
        existing_meds_context = "\n".join([
            f"- Name: {m.get('name')}, Purpose: {m.get('purpose')}, Special Instructions: {m.get('special_instructions', '')}"
            for m in existing_meds
        ])

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured")

    llm = ChatGoogleGenerativeAI(
        model="gemini-3.1-flash-lite",
        google_api_key=api_key,
        temperature=0.1 # Low temperature for factual accuracy
    )

    # 1. Determine or extract the drug name
    target_drug_name = drug_name
    encoded_image = None
    mime_type = None

    if image:
        # Read the file and encode to base64
        file_bytes = await image.read()
        # Reset file pointer so it can be read again if needed
        await image.seek(0)
        encoded_image = base64.b64encode(file_bytes).decode("utf-8")
        mime_type = image.content_type or "image/jpeg"

        if not target_drug_name:
            # Call Gemini to extract only the drug name from the image
            ocr_prompt = (
                "Identify the brand name or generic name of the medication shown in this image. "
                "Respond with ONLY the name of the drug. If you cannot identify the drug, respond with 'unknown'."
            )
            try:
                ocr_response = llm.invoke([
                    HumanMessage(content=[
                        {"type": "text", "text": ocr_prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime_type};base64,{encoded_image}"}
                        }
                    ])
                ])
                extracted_name = ocr_response.content.strip()
                if extracted_name.lower() != "unknown" and len(extracted_name) < 100:
                    target_drug_name = extracted_name
            except Exception as e:
                print(f"Error extracting drug name from image: {e}")

    if audio:
        audio_bytes = await audio.read()
        encoded_audio = base64.b64encode(audio_bytes).decode("utf-8")
        mime_type = audio.content_type or "audio/webm"
        
        transcribe_llm = ChatGoogleGenerativeAI(
            model="gemini-3.5-flash",
            google_api_key=api_key,
            temperature=0.1 # Low temperature for factual accuracy
        )

        if not target_drug_name:
            transcription_prompt = (
                "Listen to this audio clip and extract the name of the medication mentioned. "
                "Respond with ONLY the name of the drug. If you cannot identify the drug, respond with 'unknown'."
            )
            try:
                transcription_response = transcribe_llm.invoke([
                    HumanMessage(content=[
                        {"type": "text", "text": transcription_prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime_type};base64,{encoded_audio}"}
                        }
                    ])
                ])
                if isinstance(transcription_response.content, list):
                    extracted_name = transcription_response.content[0]["text"].strip()
                else:
                    extracted_name = transcription_response.content.strip()
                print(extracted_name)
                if extracted_name.lower() != "unknown" and len(extracted_name) < 100:
                    target_drug_name = extracted_name
            except Exception as e:
                print(f"Error extracting drug name from audio: {e}")

    # 2. Consult openFDA API using the drug name
    fda_data = None
    rxcui_list = []
    ground_truth_context = ""
    if target_drug_name:
        fda_data = await fetch_drug_info_from_fda(target_drug_name)
        if fda_data:
            brand_names = fda_data.get("openfda", {}).get("brand_name", [])
            generic_names = fda_data.get("openfda", {}).get("generic_name", [])
            rxcui_list = fda_data.get("openfda", {}).get("rxcui", [])

            brand_str = brand_names[0] if brand_names else target_drug_name
            generic_str = generic_names[0] if generic_names else ""

            active_ingredients = fda_data.get("active_ingredient", [])
            purpose = fda_data.get("purpose", [])
            indications = fda_data.get("indications_and_usage", [])
            warnings = fda_data.get("warnings", [])
            do_not_use = fda_data.get("do_not_use", [])
            ask_doctor_or_pharmacist = fda_data.get("ask_doctor_or_pharmacist", [])
            dosage_admin = fda_data.get("dosage_and_administration", [])

            fda_details = []
            fda_details.append(f"Official Brand Name: {brand_str}")
            if generic_str:
                fda_details.append(f"Official Generic Name: {generic_str}")
            if active_ingredients:
                fda_details.append(f"Active Ingredients: {' '.join(active_ingredients)}")
            if purpose:
                fda_details.append(f"Purpose: {' '.join(purpose)}")
            if indications:
                fda_details.append(f"Indications and Usage: {' '.join(indications)}")
            if warnings:
                fda_details.append(f"Warnings: {' '.join(warnings)}")
            if do_not_use:
                fda_details.append(f"Do Not Use: {' '.join(do_not_use)}")
            if ask_doctor_or_pharmacist:
                fda_details.append(f"Ask Doctor or Pharmacist: {' '.join(ask_doctor_or_pharmacist)}")
            if dosage_admin:
                fda_details.append(f"Dosage and Administration Guidelines: {' '.join(dosage_admin)}")

            ground_truth_context = "\n".join(fda_details)

    # 3. Bind LLM to Pydantic schema
    structured_llm = llm.with_structured_output(MedicationCreate)

    prompt_text = (
        "You are an expert pharmacist and medical assistant. "
        "Extract the medication details and create an optimal schedule plan. "
        "Determine if it should be taken with food, the best general times of day, "
        "and generate specific 24-hour times (HH:MM) for a notification reminder system based on the frequency (e.g. if twice a day, maybe 08:00 and 20:00). "
        "Check for any potential adverse drug events (ADE) or interactions between this new medication and the user's current medications. "
        "List any critical drug-drug interactions with current medications or drug-food interactions in the 'interactions_to_avoid' field. "
        "Explain any interactions or warnings clearly in the 'special_instructions' or 'simplified_explanation' if applicable."
    )

    if existing_meds_context:
        prompt_text += (
            "\n\nCRITICAL: The user is currently taking the following medications. "
            "Evaluate if the new scanned/input medication has dangerous interactions or contraindications with them:\n"
            f"=== CURRENT USER MEDICATIONS ===\n{existing_meds_context}\n================================\n"
        )

    if ground_truth_context:
        prompt_text += (
            "\n\nCRITICAL: Use the following official FDA label information as the absolute ground truth. "
            "Ensure the name, purpose, interactions, and general warnings are derived accurately from this context: \n"
            f"=== FDA GROUND TRUTH ===\n{ground_truth_context}\n========================\n"
        )

    message_content = [{"type": "text", "text": prompt_text}]

    # If openFDA found details, we can also specify the target name to look for
    if target_drug_name:
        message_content.append({"type": "text", "text": f"The target drug name is: {target_drug_name}"})

    if image and encoded_image:
        message_content.append({
            "type": "image_url",
            "image_url": {"url": f"data:{mime_type};base64,{encoded_image}"}
        })

    try:
        # Send the message to Gemini to get the structured Pydantic object
        extracted_med: MedicationCreate = structured_llm.invoke([
            HumanMessage(content=message_content)
        ])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze medication: {str(e)}")

    # Inject RxCUI list from FDA data if available
    if rxcui_list:
        extracted_med.rxcui = rxcui_list

    # Generate a temporary ID and timestamp (do not save to MongoDB)
    temp_id = str(ObjectId())
    now = datetime.now(timezone.utc)

    return MedicationResponse(
        **extracted_med.model_dump(),
        id=temp_id,
        created_at=now
    )

@router.post("/history", response_model=DailyActionPlanEntry)
async def log_action_plan_entry(
    entry: DailyActionPlanEntry,
    current_user: dict = Depends(get_current_user)
):
    doc = entry.model_dump()
    doc["username"] = current_user["username"]
    
    await action_plan_collection.update_one(
        {
            "username": current_user["username"],
            "medication_name": entry.medication_name,
            "scheduled_time": entry.scheduled_time
        },
        {"$set": doc},
        upsert=True
    )
    return entry

@router.get("/history", response_model=List[DailyActionPlanEntry])
async def get_action_plan_history(
    current_user: dict = Depends(get_current_user)
):
    cursor = action_plan_collection.find({"username": current_user["username"]})
    entries = []
    async for doc in cursor:
        entries.append(DailyActionPlanEntry(
            medication_id=doc.get("medication_id", ""),
            medication_name=doc.get("medication_name", ""),
            dosage=doc.get("dosage", ""),
            scheduled_time=doc.get("scheduled_time"),
            status=doc.get("status", "pending"),
            taken_at=doc.get("taken_at")
        ))
    return entries
