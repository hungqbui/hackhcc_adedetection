import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from langchain_google_genai import ChatGoogleGenerativeAI
from auth import get_current_user

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
            temperature=0.7
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