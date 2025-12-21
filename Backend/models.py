from typing import List, Optional, Literal, Any
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    created_at: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class MessageRequest(BaseModel):
    phone: str
    message: str

class TemplateCreate(BaseModel):
    name: str
    language: str
    category: Literal["MARKETING", "UTILITY"]
    components: List["Component"]


class Component(BaseModel):
    type: Literal["HEADER", "BODY", "FOOTER", "BUTTONS"]

    # HEADER
    format: Optional[Literal["TEXT", "IMAGE", "DOCUMENT", "LOCATION"]] = None
    text: Optional[str] = None
    example: Optional[dict] = None

    # BUTTONS
    buttons: Optional[List[dict]] = None

class TemplateRequest(BaseModel):
    phone: str
    template_name: str
    language_code: str = "en"
    body_parameters: List[str] = []
    header_parameters: List[str] = []  # For TEXT params or Media URLs
    header_type: Optional[str] = None  # IMAGE, VIDEO, DOCUMENT, TEXT, or None

class BroadcastRequest(BaseModel):
    name: str
    phones: List[str]
    template_name: str
    template_id: Optional[str] = None
    language_code: str = "en"
    body_parameters: List[str] = []
    header_parameters: List[str] = []
    header_type: Optional[str] = None
