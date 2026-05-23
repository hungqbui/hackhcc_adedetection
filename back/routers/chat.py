import os
import base64
import math
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from pydantic import BaseModel
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.messages import HumanMessage, ToolMessage
from langchain_core.tools import tool
from auth import get_current_user
from database import medication_collection, schedule_collection, changelog_collection

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str

@router.post("/", response_model=ChatResponse)
async def chat_with_gemini(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    # Verify the API key is present
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not configured in the environment"
        )

    try:
        # Initialize the Langchain Gemini Chat model
        llm = ChatGoogleGenerativeAI(
            model="gemini-3.1-flash-lite",
            google_api_key=api_key,
            temperature=0.7,
            max_output_tokens=512
        )

        # Call the Gemini API via Langchain
        response = llm.invoke(request.message)

        # Gemini's response content can sometimes be a list of blocks instead of a string
        reply_text = response.content
        if isinstance(reply_text, list):
            reply_text = " ".join(block.get("text", "") for block in reply_text if isinstance(block, dict) and "text" in block)
        elif not isinstance(reply_text, str):
            reply_text = str(reply_text)

        return ChatResponse(reply=reply_text)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error communicating with Gemini API: {str(e)}")

class MedicationAdvisingInfo(BaseModel):
    id: str
    name: str
    purpose: str
    dosage: str
    frequency: str
    similarity: float

class ChatAdvisingResponse(BaseModel):
    reply: str
    retrieved_medications: List[MedicationAdvisingInfo]
    action: Optional[str] = None

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if not v1 or not v2:
        return 0.0
    dot_product = sum(a * b for a, b in zip(v1, v2))
    norm_a = math.sqrt(sum(a * a for a in v1))
    norm_b = math.sqrt(sum(b * b for b in v2))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot_product / (norm_a * norm_b)

@router.post("/chat_advising", response_model=ChatAdvisingResponse)
@router.post("/advising", response_model=ChatAdvisingResponse)
async def chat_advising(
    message: str = Form(...),
    history: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured")

    embeddings_model = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001", google_api_key=api_key)
    
    top_meds = [] # Captured by the tool

    @tool
    async def search_patient_medications(query: str) -> str:
        """Search the patient's medical records for medications relevant to their query. Use this tool when the user asks about their medications, side effects, interactions, schedule, or anything related to their prescriptions."""
        nonlocal top_meds
        try:
            query_vector = embeddings_model.embed_query(query)
        except Exception as e:
            return f"Failed to generate query embedding: {str(e)}"

        # Get scheduled medications first
        schedule = await schedule_collection.find_one({"username": current_user["username"]})
        scheduled_names = set()
        if schedule and "slots" in schedule:
            for slot in schedule["slots"]:
                scheduled_names.update(m.lower() for m in slot.get("medication_names", []))

        if not scheduled_names:
            return "No medications currently registered in the master schedule."

        meds_cursor = medication_collection.find({"username": current_user["username"]})
        meds = await meds_cursor.to_list(length=100)
        
        # Filter meds to only those in the master schedule
        meds = [m for m in meds if m.get("name", "").lower() in scheduled_names]

        scored_meds = []
        for med in meds:
            vector = med.get("embedding")
            if not vector:
                try:
                    embedding_text = (
                        f"Medication: {med.get('name')}. "
                        f"Purpose: {med.get('purpose')}. "
                        f"Type: {med.get('type')}. "
                        f"Dosage: {med.get('dosage')} ({med.get('frequency')}). "
                        f"Instructions: {med.get('special_instructions')}. "
                        f"Interactions: {', '.join(med.get('interactions_to_avoid', [])) if med.get('interactions_to_avoid') else 'None'}. "
                        f"Side effects: {', '.join(med.get('side_effects', [])) if med.get('side_effects') else 'None'}. "
                        f"When to avoid: {med.get('when_to_avoid')}. "
                        f"Explanation: {med.get('simplified_explanation')}."
                    )
                    vector = embeddings_model.embed_query(embedding_text)
                    await medication_collection.update_one({"_id": med["_id"]}, {"$set": {"embedding": vector}})
                except Exception as e:
                    print(f"Failed to generate missing embedding for {med['name']}: {e}")
                    continue

            sim = cosine_similarity(query_vector, vector)
            scored_meds.append({
                "id": med["_id"],
                "name": med["name"],
                "purpose": med["purpose"],
                "dosage": med["dosage"],
                "frequency": med["frequency"],
                "with_food": med.get("with_food", False),
                "interactions_to_avoid": med.get("interactions_to_avoid", []),
                "notes": med.get("special_instructions", ""),
                "similarity": sim
            })

        scored_meds.sort(key=lambda x: x["similarity"], reverse=True)
        top_meds = scored_meds[:5]

        if not top_meds:
            return "No medications currently registered in database context."

        result = "=== RETRIEVED MEDICATIONS (CONTEXT) ===\n"
        for i, med in enumerate(top_meds):
            # Look up actual scheduled times from master schedule
            scheduled_times = []
            if schedule and "slots" in schedule:
                for slot in schedule["slots"]:
                    if any(m.lower() == med["name"].lower() for m in slot.get("medication_names", [])):
                        scheduled_times.append(slot["time"])
            result += (
                f"{i+1}. {med['name']} ({med['dosage']}, {med['frequency']})\n"
                f"   Purpose: {med['purpose']}\n"
                f"   Notes: {med.get('notes') or 'N/A'}\n"
                f"   With Food: {med.get('with_food')}\n"
                f"   Interactions to Avoid: {', '.join(med.get('interactions_to_avoid') or [])}\n"
                f"   Scheduled Times (master schedule): {', '.join(scheduled_times) if scheduled_times else 'Not currently scheduled'}\n"
                f"   Similarity Match: {med['similarity']:.2%}\n\n"
            )
        return result

    @tool
    async def check_missed_medications(dummy: str = "") -> str:
        """Check the database for any medications the user might have missed taking today based on the current time. Use this when the user asks what they forgot, missed, or if they are behind on their schedule."""
        from datetime import datetime
        try:
            now = datetime.now()
            current_time_str = now.strftime("%H:%M")
            
            schedule = await schedule_collection.find_one({"username": current_user["username"]})
            if not schedule or "slots" not in schedule:
                return f"The current time is {current_time_str}. No active schedule found for this patient."
            
            missed = []
            for slot in schedule["slots"]:
                t = slot.get("time", "")
                if t and t < current_time_str:
                    for med_name in slot.get("medication_names", []):
                        missed.append(f"- {med_name} scheduled at {t}")
                        
            if not missed:
                return f"The current time is {current_time_str}. Based on the schedule, the patient has no missed medications so far today."
            
            return (
                f"The current time is {current_time_str}. The patient has the following medications scheduled for earlier today "
                f"that might have been missed if not taken:\n" + "\n".join(missed)
            )
        except Exception as e:
            return f"Failed to check missed medications: {str(e)}"

    action_flag = None

    @tool
    async def modify_schedule(medication_name: str, action: str, target_time: str, reason: str, new_time: str = "") -> str:
        """Modify the user's master schedule.
        `action` must be one of: 'add', 'remove', 'move'.
        `target_time` is the time to add to, remove from, or move from (HH:MM).
        `new_time` is only used if action is 'move' (HH:MM)."""
        print("\n\n\n" + medication_name + " " + action + " " + target_time + " " + reason + " " + new_time)
        nonlocal action_flag
        from datetime import datetime
        try:
            schedule = await schedule_collection.find_one({"username": current_user["username"]})
            if not schedule:
                return "Could not find a master schedule for this patient."
            
            slots = schedule.get("slots", [])
            summary = ""
            
            # Helper to find the actual scheduled time for a medication
            def find_actual_time(med_name):
                for s in slots:
                    if any(m.lower() == med_name.lower() for m in s.get("medication_names", [])):
                        return s["time"]
                return None

            # Helper to remove medication from a specific time slot (case-insensitive)
            def remove_med(time_val):
                for s in slots:
                    if s["time"] == time_val:
                        s["medication_names"] = [m for m in s["medication_names"] if m.lower() != medication_name.lower()]

            # Helper to add medication to a specific time slot
            def add_med(time_val):
                found = False
                for s in slots:
                    if s["time"] == time_val:
                        if not any(m.lower() == medication_name.lower() for m in s["medication_names"]):
                            s["medication_names"].append(medication_name)
                        found = True
                if not found:
                    slots.append({
                        "time": time_val, 
                        "medication_names": [medication_name], 
                        "instructions": "", 
                        "interaction_warnings": ""
                    })

            if action == 'add':
                add_med(target_time)
                summary = f"Added {medication_name} at {target_time}."
            elif action == 'remove':
                # Auto-correct: if med not at target_time, find where it actually is
                actual = find_actual_time(medication_name)
                effective_time = actual if actual else target_time
                if actual and actual != target_time:
                    print(f"[AUTO-CORRECT] LLM said {target_time} but med is at {actual}")
                remove_med(effective_time)
                summary = f"Removed {medication_name} from {effective_time}."
            elif action == 'move':
                actual = find_actual_time(medication_name)
                effective_time = actual if actual else target_time
                if actual and actual != target_time:
                    print(f"[AUTO-CORRECT] LLM said {target_time} but med is at {actual}")
                remove_med(effective_time)
                add_med(new_time)
                summary = f"Moved {medication_name} from {effective_time} to {new_time}."
            else:
                return "Invalid action. Use 'add', 'remove', or 'move'."
            
            # Clean up empty slots and sort
            slots = [s for s in slots if s.get("medication_names")]
            slots.sort(key=lambda x: x["time"])
            
            await schedule_collection.update_one({"username": current_user["username"]}, {"$set": {"slots": slots}})
            
            from models import ChangeLogInDB
            import uuid
            log = ChangeLogInDB(
                _id=str(uuid.uuid4()),
                username=current_user["username"],
                summary=summary,
                reason=reason,
                timestamp=datetime.utcnow()
            )
            await changelog_collection.insert_one(log.model_dump(by_alias=True))
            
            print(summary)

            action_flag = "REDIRECT_TO_DASHBOARD"
            return f"Successfully updated schedule: {summary}"
        except Exception as e:
            return f"Failed to modify schedule: {str(e)}"
            
    @tool
    async def get_recent_changelogs(dummy: str = "") -> str:
        """Check the 20 most recent changes made to the patient's schedule and the reasons why. Use this to understand past modifications."""
        try:
            cursor = changelog_collection.find({"username": current_user["username"]}).sort("timestamp", -1).limit(20)
            logs = await cursor.to_list(length=20)
            if not logs:
                return "No past schedule modifications found."
            
            result = "=== RECENT SCHEDULE CHANGES ===\n"
            for log in logs:
                time_str = log["timestamp"].strftime("%Y-%m-%d %H:%M")
                result += f"[{time_str}] {log['summary']} | Reason: {log['reason']}\n"
            return result
        except Exception as e:
            return f"Failed to retrieve changelogs: {str(e)}"

    # 4. Construct prompt for Gemini
    prompt_text = (
        "You are MedEase AI, an expert medical advisor and pharmacist.\n"
        "A user is asking a question about their health, symptoms, or medications. Answer concisely and to the point.\n"
        "If you see an uploaded image (such as a pill, skin rash, or prescription label), analyze it and relate it to the user's query and their medications.\n"
        "Be empathetic, accurate, and clear. Always include standard medical disclaimers if appropriate, but address the question directly.\n\n"
        f"User Query: {message}\n"
    )

    # Handle image if present
    message_content = [{"type": "text", "text": prompt_text}]
    if image:
        file_bytes = await image.read()
        encoded_image = base64.b64encode(file_bytes).decode("utf-8")
        mime_type = image.content_type or "image/jpeg"
        message_content.append({
            "type": "image_url",
            "image_url": {"url": f"data:{mime_type};base64,{encoded_image}"}
        })
        
    if audio:
        audio_bytes = await audio.read()
        encoded_audio = base64.b64encode(audio_bytes).decode("utf-8")
        mime_type = audio.content_type or "audio/webm"
        message_content.append({
            "type": "image_url",
            "image_url": {"url": f"data:{mime_type};base64,{encoded_audio}"}
        })

    messages = []
    if history:
        import json
        try:
            history_data = json.loads(history)
            from langchain_core.messages import AIMessage
            for msg in history_data:
                if msg.get("role") == "user":
                    messages.append(HumanMessage(content=msg.get("text", "")))
                else:
                    messages.append(AIMessage(content=msg.get("text", "")))
        except Exception as e:
            print(f"Failed to parse history: {e}")

    messages.append(HumanMessage(content=message_content))

    # 5. Call LLM
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-3.1-flash-lite",
            google_api_key=api_key,
            temperature=0.3,
            max_output_tokens=512
        )
        llm_with_tools = llm.bind_tools([search_patient_medications, check_missed_medications, modify_schedule, get_recent_changelogs])
        
        # First Invocation
        response = llm_with_tools.invoke(messages)
        messages.append(response)

        # Tool Execution Loop
        max_iterations = 5
        iterations = 0
        while response.tool_calls and iterations < max_iterations:
            iterations += 1
            for tool_call in response.tool_calls:
                if tool_call["name"] == "search_patient_medications":
                    tool_output = await search_patient_medications.ainvoke(tool_call["args"])
                elif tool_call["name"] == "check_missed_medications":
                    tool_output = await check_missed_medications.ainvoke(tool_call["args"])
                elif tool_call["name"] == "modify_schedule":
                    tool_output = await modify_schedule.ainvoke(tool_call["args"])
                elif tool_call["name"] == "get_recent_changelogs":
                    tool_output = await get_recent_changelogs.ainvoke(tool_call["args"])
                else:
                    tool_output = "Unknown tool"

                messages.append(ToolMessage(
                    content=str(tool_output),
                    tool_call_id=tool_call["id"]
                ))
            
            # Next Invocation with tool results
            response = llm_with_tools.invoke(messages)
            messages.append(response)

        reply_text = response.content
        if isinstance(reply_text, list):
            reply_text = " ".join(block.get("text", "") for block in reply_text if isinstance(block, dict) and "text" in block)
        elif not isinstance(reply_text, str):
            reply_text = str(reply_text)

        # Map to MedicationAdvisingInfo list
        retrieved_meds_info = [
            MedicationAdvisingInfo(
                id=m["id"],
                name=m["name"],
                purpose=m["purpose"],
                dosage=m["dosage"],
                frequency=m["frequency"],
                similarity=m["similarity"]
            ) for m in top_meds
        ]

        return ChatAdvisingResponse(
            reply=reply_text,
            retrieved_medications=retrieved_meds_info,
            action=action_flag
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query advisor: {str(e)}")


# ── Streaming SSE endpoint ───────────────────────────────────────────
from fastapi.responses import StreamingResponse
import json as _json

@router.post("/chat_advising_stream")
async def chat_advising_stream(
    message: str = Form(...),
    history: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    """SSE streaming version of chat_advising.
    
    Event types sent to the client:
      event: token        data: {"token": "..."}
      event: metadata     data: {"retrieved_medications": [...], "action": "..."}
      event: done         data: {}
      event: error        data: {"detail": "..."}
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured")

    embeddings_model = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001", google_api_key=api_key)
    top_meds = []

    # ── Duplicate tool definitions (they close over request-scoped variables) ──
    @tool
    async def search_patient_medications(query: str) -> str:
        """Search the patient's medical records for medications relevant to their query. Use this tool when the user asks about their medications, side effects, interactions, schedule, or anything related to their prescriptions."""
        nonlocal top_meds
        try:
            query_vector = embeddings_model.embed_query(query)
        except Exception as e:
            return f"Failed to generate query embedding: {str(e)}"

        schedule = await schedule_collection.find_one({"username": current_user["username"]})
        scheduled_names = set()
        if schedule and "slots" in schedule:
            for slot in schedule["slots"]:
                scheduled_names.update(m.lower() for m in slot.get("medication_names", []))
        if not scheduled_names:
            return "No medications currently registered in the master schedule."

        meds_cursor = medication_collection.find({"username": current_user["username"]})
        meds = await meds_cursor.to_list(length=100)
        meds = [m for m in meds if m.get("name", "").lower() in scheduled_names]

        scored_meds = []
        for med in meds:
            vector = med.get("embedding")
            if not vector:
                try:
                    embedding_text = (
                        f"Medication: {med.get('name')}. "
                        f"Purpose: {med.get('purpose')}. "
                        f"Type: {med.get('type')}. "
                        f"Dosage: {med.get('dosage')} ({med.get('frequency')}). "
                        f"Instructions: {med.get('special_instructions')}. "
                        f"Interactions: {', '.join(med.get('interactions_to_avoid', [])) if med.get('interactions_to_avoid') else 'None'}. "
                        f"Side effects: {', '.join(med.get('side_effects', [])) if med.get('side_effects') else 'None'}. "
                        f"When to avoid: {med.get('when_to_avoid')}. "
                        f"Explanation: {med.get('simplified_explanation')}."
                    )
                    vector = embeddings_model.embed_query(embedding_text)
                    await medication_collection.update_one({"_id": med["_id"]}, {"$set": {"embedding": vector}})
                except Exception:
                    continue
            sim = cosine_similarity(query_vector, vector)
            scored_meds.append({
                "id": med["_id"], "name": med["name"], "purpose": med["purpose"],
                "dosage": med["dosage"], "frequency": med["frequency"],
                "with_food": med.get("with_food", False),
                "interactions_to_avoid": med.get("interactions_to_avoid", []),
                "notes": med.get("special_instructions", ""), "similarity": sim
            })
        scored_meds.sort(key=lambda x: x["similarity"], reverse=True)
        top_meds = scored_meds[:5]
        if not top_meds:
            return "No medications currently registered in database context."

        result = "=== RETRIEVED MEDICATIONS (CONTEXT) ===\n"
        for i, med in enumerate(top_meds):
            scheduled_times = []
            if schedule and "slots" in schedule:
                for slot_s in schedule["slots"]:
                    if any(m.lower() == med["name"].lower() for m in slot_s.get("medication_names", [])):
                        scheduled_times.append(slot_s["time"])
            result += (
                f"{i+1}. {med['name']} ({med['dosage']}, {med['frequency']})\n"
                f"   Purpose: {med['purpose']}\n"
                f"   Notes: {med.get('notes') or 'N/A'}\n"
                f"   With Food: {med.get('with_food')}\n"
                f"   Interactions to Avoid: {', '.join(med.get('interactions_to_avoid') or [])}\n"
                f"   Scheduled Times (master schedule): {', '.join(scheduled_times) if scheduled_times else 'Not currently scheduled'}\n"
                f"   Similarity Match: {med['similarity']:.2%}\n\n"
            )
        return result

    @tool
    async def check_missed_medications(dummy: str = "") -> str:
        """Check the database for any medications the user might have missed taking today based on the current time."""
        from datetime import datetime
        try:
            now = datetime.now()
            current_time_str = now.strftime("%H:%M")
            schedule = await schedule_collection.find_one({"username": current_user["username"]})
            if not schedule or "slots" not in schedule:
                return f"The current time is {current_time_str}. No active schedule found for this patient."
            missed = []
            for slot in schedule["slots"]:
                t = slot.get("time", "")
                if t and t < current_time_str:
                    for med_name in slot.get("medication_names", []):
                        missed.append(f"- {med_name} scheduled at {t}")
            if not missed:
                return f"The current time is {current_time_str}. Based on the schedule, the patient has no missed medications so far today."
            return (
                f"The current time is {current_time_str}. The patient has the following medications scheduled for earlier today "
                f"that might have been missed if not taken:\n" + "\n".join(missed)
            )
        except Exception as e:
            return f"Failed to check missed medications: {str(e)}"

    action_flag = None

    @tool
    async def modify_schedule(medication_name: str, action: str, target_time: str, reason: str, new_time: str = "") -> str:
        """Modify the user's master schedule.
        `action` must be one of: 'add', 'remove', 'move'.
        `target_time` is the time to add to, remove from, or move from (HH:MM).
        `new_time` is only used if action is 'move' (HH:MM)."""
        print(f"\n\n[STREAM] modify_schedule called: {medication_name} {action} {target_time} {reason} {new_time}")
        nonlocal action_flag
        from datetime import datetime
        try:
            schedule = await schedule_collection.find_one({"username": current_user["username"]})
            if not schedule:
                return "Could not find a master schedule for this patient."
            slots = schedule.get("slots", [])
            summary = ""

            # Helper to find the actual scheduled time for a medication
            def find_actual_time(med_name):
                for s in slots:
                    if any(m.lower() == med_name.lower() for m in s.get("medication_names", [])):
                        return s["time"]
                return None

            def remove_med(time_val):
                for s in slots:
                    if s["time"] == time_val:
                        s["medication_names"] = [m for m in s["medication_names"] if m.lower() != medication_name.lower()]

            def add_med(time_val):
                found = False
                for s in slots:
                    if s["time"] == time_val:
                        if not any(m.lower() == medication_name.lower() for m in s["medication_names"]):
                            s["medication_names"].append(medication_name)
                        found = True
                if not found:
                    slots.append({"time": time_val, "medication_names": [medication_name], "instructions": "", "interaction_warnings": ""})

            if action == 'add':
                add_med(target_time)
                summary = f"Added {medication_name} at {target_time}."
            elif action == 'remove':
                actual = find_actual_time(medication_name)
                effective_time = actual if actual else target_time
                if actual and actual != target_time:
                    print(f"[AUTO-CORRECT] LLM said {target_time} but med is at {actual}")
                remove_med(effective_time)
                summary = f"Removed {medication_name} from {effective_time}."
            elif action == 'move':
                actual = find_actual_time(medication_name)
                effective_time = actual if actual else target_time
                if actual and actual != target_time:
                    print(f"[AUTO-CORRECT] LLM said {target_time} but med is at {actual}")
                remove_med(effective_time)
                add_med(new_time)
                summary = f"Moved {medication_name} from {effective_time} to {new_time}."
            else:
                return "Invalid action. Use 'add', 'remove', or 'move'."

            slots_clean = [s for s in slots if s.get("medication_names")]
            slots_clean.sort(key=lambda x: x["time"])
            await schedule_collection.update_one({"username": current_user["username"]}, {"$set": {"slots": slots_clean}})

            from models import ChangeLogInDB
            import uuid
            log = ChangeLogInDB(
                _id=str(uuid.uuid4()), username=current_user["username"],
                summary=summary, reason=reason, timestamp=datetime.utcnow()
            )
            await changelog_collection.insert_one(log.model_dump(by_alias=True))
            action_flag = "REDIRECT_TO_DASHBOARD"
            return f"Successfully updated schedule: {summary}"
        except Exception as e:
            return f"Failed to modify schedule: {str(e)}"

    @tool
    async def get_recent_changelogs(dummy: str = "") -> str:
        """Check the 20 most recent changes made to the patient's schedule and the reasons why."""
        try:
            cursor = changelog_collection.find({"username": current_user["username"]}).sort("timestamp", -1).limit(20)
            logs = await cursor.to_list(length=20)
            if not logs:
                return "No past schedule modifications found."
            result = "=== RECENT SCHEDULE CHANGES ===\n"
            for log in logs:
                time_str = log["timestamp"].strftime("%Y-%m-%d %H:%M")
                result += f"[{time_str}] {log['summary']} | Reason: {log['reason']}\n"
            return result
        except Exception as e:
            return f"Failed to retrieve changelogs: {str(e)}"

    all_tools = [search_patient_medications, check_missed_medications, modify_schedule, get_recent_changelogs]
    tool_map = {t.name: t for t in all_tools}

    # ── Build messages ──
    prompt_text = (
        "You are MedEase AI, an expert medical advisor and pharmacist.\n"
        "A user is asking a question about their health, symptoms, or medications.\n"
        "If you see an uploaded image (such as a pill, skin rash, or prescription label), analyze it and relate it to the user's query and their medications.\n"
        "Be empathetic, accurate, and clear. Always include standard medical disclaimers if appropriate, but address the question directly.\n\n"
        f"User Query: {message}\n"
    )
    message_content = [{"type": "text", "text": prompt_text}]
    if image:
        file_bytes = await image.read()
        encoded_image = base64.b64encode(file_bytes).decode("utf-8")
        mime_type = image.content_type or "image/jpeg"
        message_content.append({"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{encoded_image}"}})
    if audio:
        audio_bytes = await audio.read()
        encoded_audio = base64.b64encode(audio_bytes).decode("utf-8")
        mime_type = audio.content_type or "audio/webm"
        message_content.append({"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{encoded_audio}"}})

    llm_messages = []
    if history:
        try:
            history_data = _json.loads(history)
            from langchain_core.messages import AIMessage
            for msg in history_data:
                if msg.get("role") == "user":
                    llm_messages.append(HumanMessage(content=msg.get("text", "")))
                else:
                    llm_messages.append(AIMessage(content=msg.get("text", "")))
        except Exception:
            pass
    llm_messages.append(HumanMessage(content=message_content))

    async def event_generator():
        try:
            llm = ChatGoogleGenerativeAI(
                model="gemini-3.1-flash-lite", google_api_key=api_key,
                temperature=0.3, max_output_tokens=512
            )
            llm_with_tools = llm.bind_tools(all_tools)

            # ── Run tool loop synchronously first ──
            response = await llm_with_tools.ainvoke(llm_messages)
            llm_messages.append(response)

            max_iterations = 5
            iterations = 0
            while response.tool_calls and iterations < max_iterations:
                iterations += 1
                print(f"[STREAM] Tool loop iteration {iterations}, tool_calls: {[tc['name'] for tc in response.tool_calls]}")
                for tc in response.tool_calls:
                    fn = tool_map.get(tc["name"])
                    print(f"[STREAM] Executing tool: {tc['name']} with args: {tc['args']}")
                    tool_output = await fn.ainvoke(tc["args"]) if fn else "Unknown tool"
                    print(f"[STREAM] Tool output: {str(tool_output)[:200]}")
                    llm_messages.append(ToolMessage(content=str(tool_output), tool_call_id=tc["id"]))
                response = await llm_with_tools.ainvoke(llm_messages)
                llm_messages.append(response)

            # ── Send metadata event ──
            retrieved_meds_info = [
                {"id": m["id"], "name": m["name"], "purpose": m["purpose"],
                 "dosage": m["dosage"], "frequency": m["frequency"], "similarity": m["similarity"]}
                for m in top_meds
            ]
            meta = _json.dumps({"retrieved_medications": retrieved_meds_info, "action": action_flag})
            yield f"event: metadata\ndata: {meta}\n\n"

            # ── Stream the final text response ──
            # Pop the last AI response (the final one) and re-invoke with streaming
            llm_messages.pop()  # Remove the non-streamed final response
            llm_no_tools = ChatGoogleGenerativeAI(
                model="gemini-3.1-flash-lite", google_api_key=api_key,
                temperature=0.3, max_output_tokens=512
            )
            async for chunk in llm_no_tools.astream(llm_messages):
                text = chunk.content
                if isinstance(text, list):
                    text = " ".join(b.get("text", "") for b in text if isinstance(b, dict) and "text" in b)
                if text:
                    yield f"event: token\ndata: {_json.dumps({'token': text})}\n\n"

            yield "event: done\ndata: {}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {_json.dumps({'detail': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")