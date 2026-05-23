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
from database import medication_collection

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
    image: Optional[UploadFile] = File(None),
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

        meds_cursor = medication_collection.find({"username": current_user["username"]})
        meds = await meds_cursor.to_list(length=100)

        scored_meds = []
        for med in meds:
            vector = med.get("embedding")
            if not vector:
                try:
                    embedding_text = f"Medication: {med['name']}. Purpose: {med['purpose']}."
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
            result += (
                f"{i+1}. {med['name']} ({med['dosage']}, {med['frequency']})\n"
                f"   Purpose: {med['purpose']}\n"
                f"   Notes: {med.get('notes') or 'N/A'}\n"
                f"   With Food: {med.get('with_food')}\n"
                f"   Interactions to Avoid: {', '.join(med.get('interactions_to_avoid') or [])}\n"
                f"   Similarity Match: {med['similarity']:.2%}\n\n"
            )
        return result

    # 4. Construct prompt for Gemini
    prompt_text = (
        "You are MedEase AI, an expert medical advisor and pharmacist.\n"
        "A user is asking a question about their health, symptoms, or medications.\n"
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

    messages = [HumanMessage(content=message_content)]

    # 5. Call LLM
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-3.1-flash-lite",
            google_api_key=api_key,
            temperature=0.3,
            max_output_tokens=512
        )
        llm_with_tools = llm.bind_tools([search_patient_medications])
        
        # First Invocation
        response = llm_with_tools.invoke(messages)
        messages.append(response)

        # Tool Execution Loop
        if response.tool_calls:
            for tool_call in response.tool_calls:
                if tool_call["name"] == "search_patient_medications":
                    tool_output = await search_patient_medications.ainvoke(tool_call["args"])
                    messages.append(ToolMessage(
                        content=str(tool_output),
                        tool_call_id=tool_call["id"]
                    ))
            
            # Second Invocation with tool results
            response = llm_with_tools.invoke(messages)

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
            retrieved_medications=retrieved_meds_info
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query advisor: {str(e)}")