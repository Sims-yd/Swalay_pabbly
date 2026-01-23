"""
Gemini AI Service for WhatsApp Business API Chatbot
Handles all interactions with the Gemini API
"""

import google.generativeai as genai
from typing import List, Dict, Optional
import logging
from config import settings

logger = logging.getLogger(__name__)

# System prompt that strictly defines the chatbot's domain
WHATSAPP_BUSINESS_SYSTEM_PROMPT = """You are a WhatsApp Business API assistant. 
You help businesses:
- Set up WhatsApp Business API accounts
- Configure Meta Developer accounts
- Manage WhatsApp message templates
- Send and receive messages
- Handle broadcast messaging
- Understand webhook events
- Troubleshoot WhatsApp Cloud API issues
- Explain Meta verification steps
- Guide through phone number onboarding
- Explain message status, pricing, and limitations

You MUST NOT answer anything outside this domain.
If a question is unrelated, politely refuse and redirect back to WhatsApp Business API topics.

Keep your responses concise, helpful, and professional. Use bullet points and formatting when explaining steps or lists.
When providing code examples, use appropriate markdown formatting."""


class GeminiChatService:
    """Service class for Gemini AI chat functionality"""
    
    def __init__(self):
        self._model = None
        self._api_key = None
        
    def _get_api_key(self) -> str:
        """Get Gemini API key from settings"""
        if not self._api_key:
            self._api_key = settings.GEMINI_API_KEY
            if not self._api_key:
                raise ValueError("GEMINI_API_KEY environment variable is not set")
        return self._api_key
    
    def _get_model(self):
        """Get or create the Gemini model instance"""
        if not self._model:
            genai.configure(api_key=self._get_api_key())
            self._model = genai.GenerativeModel(
                model_name="gemini-2.0-flash",
                generation_config={
                    "temperature": 0.7,
                    "top_p": 0.95,
                    "top_k": 40,
                    "max_output_tokens": 1024,
                },
                safety_settings=[
                    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                ],
                system_instruction=WHATSAPP_BUSINESS_SYSTEM_PROMPT,
            )
        return self._model
    
    def _format_conversation_history(self, history: List[Dict[str, str]]) -> List[Dict]:
        """Format conversation history for Gemini API"""
        formatted = []
        for msg in history:
            role = "user" if msg.get("role") == "user" else "model"
            formatted.append({
                "role": role,
                "parts": [{"text": msg.get("content", "")}]
            })
        return formatted
    
    async def generate_response(
        self, 
        user_message: str, 
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        Generate a response from Gemini based on user message and conversation history
        
        Args:
            user_message: The current user message
            conversation_history: Optional list of previous messages with 'role' and 'content'
            
        Returns:
            The AI-generated response string
        """
        try:
            model = self._get_model()
            
            # Build the chat with history if provided
            if conversation_history and len(conversation_history) > 0:
                # Format history for Gemini
                formatted_history = self._format_conversation_history(conversation_history)
                chat = model.start_chat(history=formatted_history)
            else:
                chat = model.start_chat(history=[])
            
            # Generate response
            response = await chat.send_message_async(user_message)
            
            if response and response.text:
                return response.text.strip()
            else:
                return "I apologize, but I couldn't generate a response. Please try again."
                
        except Exception as e:
            logger.error(f"Error generating Gemini response: {str(e)}", exc_info=True)
            raise GeminiServiceError(f"Failed to generate response: {str(e)}")
    
    def validate_api_key(self) -> bool:
        """Validate that the Gemini API key is configured"""
        try:
            self._get_api_key()
            return True
        except ValueError:
            return False


class GeminiServiceError(Exception):
    """Custom exception for Gemini service errors"""
    pass


# Singleton instance
_gemini_service: Optional[GeminiChatService] = None


def get_gemini_service() -> GeminiChatService:
    """Get the singleton Gemini service instance"""
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiChatService()
    return _gemini_service
