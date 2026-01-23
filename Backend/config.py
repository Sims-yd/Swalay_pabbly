from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    WHATSAPP_ACCESS_TOKEN: str
    WHATSAPP_PHONE_NUMBER_ID: str
    WHATSAPP_WABA_ID: str
    WHATSAPP_APP_ID: str
    WHATSAPP_APP_SECRET: str
    WHATSAPP_API_VERSION: str = "v20.0"
    VERIFY_TOKEN: str
    FRONTEND_ORIGIN: str = "http://localhost:3000"
    META_BUSINESS_ID: str
    MONGODB_URI: str
    MONGODB_DB_NAME: str = "swalay"
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRES_IN_MINUTES: int = 600
    # Cookie settings - for GitHub Codespaces (HTTPS), set COOKIE_SECURE=true and COOKIE_SAMESITE=none
    COOKIE_SECURE: bool = True
    COOKIE_SAMESITE: str = "none"
    # Facebook OAuth Business Login (optional - set these for business login support)
    FACEBOOK_APP_ID: Optional[str] = None
    FACEBOOK_APP_SECRET: Optional[str] = None
    FACEBOOK_REDIRECT_URI: Optional[str] = None
    META_API_VERSION: str = "v21.0"
    # Gemini AI API Key for Chatbot
    GEMINI_API_KEY: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()
