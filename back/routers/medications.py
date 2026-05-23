import os
import base64
from datetime import datetime, timezone
from typing import Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.messages import HumanMessage
from bson import ObjectId

from auth import get_current_user
from models import MedicationCreate, MedicationInDB, MedicationResponse, GenerateScheduleRequest, GeneratedMasterSchedule
from database import medication_collection

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
        "Your task is to organize these into chronological daily time slots (HH:MM).\n"
        "CRITICAL RULES:\n"
        "1. Separate medications that have known negative interactions.\n"
        "2. Honor requirements like 'with food' by grouping them around standard meal times (e.g. 08:00 Breakfast, 13:00 Lunch, 19:00 Dinner).\n"
        "3. Ensure the proper hourly spacing between doses for drugs taken multiple times a day.\n"
        "4. Provide clear instructions and interaction warnings for each time slot if necessary."
    )

    try:
        schedule: GeneratedMasterSchedule = structured_llm.invoke([
            HumanMessage(content=prompt_text)
        ])
        return schedule
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate schedule: {str(e)}")

@router.post("/scan", response_model=MedicationResponse)
async def scan_medication(
    image: UploadFile = File(None),
    drug_name: str = Form(None),
    current_user: dict = Depends(get_current_user)
):
    if not image and not drug_name:
        raise HTTPException(status_code=400, detail="Must provide either an image or a drug_name")

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
        "Also list any critical drug or food interactions to avoid."
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

    # Generate an embedding for the medication based on its name and purpose
    try:
        embeddings_model = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001", google_api_key=api_key)
        embedding_text = f"Medication: {extracted_med.name}. Purpose: {extracted_med.purpose}."
        vector = embeddings_model.embed_query(embedding_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate embedding: {str(e)}")

    # Prepare database record
    now = datetime.now(timezone.utc)
    med_db = MedicationInDB(
        **extracted_med.model_dump(),
        _id=str(ObjectId()),
        username=current_user["username"],
        embedding=vector,
        created_at=now,
        updated_at=now
    )

    # Save to MongoDB
    await medication_collection.insert_one(med_db.model_dump(by_alias=True))

    return MedicationResponse(
        **extracted_med.model_dump(),
        id=med_db.id,
        created_at=med_db.created_at
    )
