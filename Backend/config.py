from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    WHATSAPP_ACCESS_TOKEN: str
    WHATSAPP_PHONE_NUMBER_ID: str
    WHATSAPP_WABA_ID: str
    WHATSAPP_APP_ID: str
    WHATSAPP_API_VERSION: str = "v20.0"
    VERIFY_TOKEN: str
    FRONTEND_ORIGIN: str = "http://localhost:3000"
    META_BUSINESS_ID: str
    MONGODB_URI: str
    MONGODB_DB_NAME: str = "swalay"
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRES_IN_MINUTES: int = 60
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    class Config:
        env_file = ".env"

settings = Settings()
