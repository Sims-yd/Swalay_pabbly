"""
Chatbot API Routes
Handles chatbot interactions via Gemini AI
"""

from fastapi import APIRouter, HTTPException
from models import ChatbotRequest, ChatbotResponse
from app.services.gemini import get_gemini_service, GeminiServiceError
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


@router.post("/chat", response_model=ChatbotResponse)
async def chat(request: ChatbotRequest):
    """
    Process a chat message and return AI response.
    
    This endpoint accepts a user message and optional conversation history,
    then returns an AI-generated response focused on WhatsApp Business API topics.
    """
    # Validate input
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    if len(request.message) > 4000:
        raise HTTPException(status_code=400, detail="Message too long. Maximum 4000 characters allowed.")
    
    # Limit conversation history to prevent context overflow
    conversation_history = request.conversation_history or []
    if len(conversation_history) > 20:
        # Keep only the last 20 messages for context
        conversation_history = conversation_history[-20:]
    
    try:
        gemini_service = get_gemini_service()
        
        # Convert ChatMessage objects to dicts for the service
        history_dicts = [
            {"role": msg.role, "content": msg.content}
            for msg in conversation_history
        ]
        
        # Generate response
        ai_response = await gemini_service.generate_response(
            user_message=request.message.strip(),
            conversation_history=history_dicts
        )
        
        return ChatbotResponse(
            response=ai_response,
            success=True
        )
        
    except GeminiServiceError as e:
        logger.error(f"Gemini service error: {str(e)}")
        return ChatbotResponse(
            response="I'm sorry, I encountered an error processing your request. Please try again.",
            success=False,
            error=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error in chatbot: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail="An unexpected error occurred. Please try again later."
        )


@router.get("/health")
async def chatbot_health():
    """Check if the chatbot service is properly configured"""
    gemini_service = get_gemini_service()
    is_configured = gemini_service.validate_api_key()
    
    return {
        "status": "ok" if is_configured else "error",
        "gemini_configured": is_configured,
        "service": "chatbot"
    }
