from typing import List, Optional, Literal, Any
from pydantic import BaseModel, EmailStr
from datetime import datetime


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


class Message(BaseModel):
    """Message model for chat messages"""
    id: Optional[str] = None
    chatId: str
    senderId: str
    receiverId: str
    direction: Literal["incoming", "outgoing"]
    text: str
    status: Literal["sending", "sent", "delivered", "read", "failed"] = "sent"
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    whatsappMessageId: Optional[str] = None  # WhatsApp's message ID from Meta API


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
    format: Optional[Literal["TEXT", "IMAGE", "VIDEO", "DOCUMENT", "LOCATION"]] = None
    text: Optional[str] = None
    example: Optional[dict] = None
    
    # New fields for media/location support (Template Creation)
    header_handle: Optional[str] = None
    location_latitude: Optional[float] = None
    location_longitude: Optional[float] = None
    location_name: Optional[str] = None
    location_address: Optional[str] = None

    # BUTTONS
    buttons: Optional[List[dict]] = None

class TemplateRequest(BaseModel):
    phone: str
    template_name: str
    language_code: str = "en"
    body_parameters: List[str] = []
    header_parameters: List[str] = []  # For TEXT params or Media URLs
    header_type: Optional[str] = None  # IMAGE, VIDEO, DOCUMENT, TEXT, or None

    # Optional Meta template id (needed for fetching media handles)
    template_id: Optional[str] = None

    # New fields for sending media/location
    media_handle: Optional[str] = None 
    location_latitude: Optional[float] = None
    location_longitude: Optional[float] = None
    location_name: Optional[str] = None
    location_address: Optional[str] = None

class BroadcastRequest(BaseModel):
    name: str
    phones: List[str]
    template_name: str
    template_id: Optional[str] = None
    language_code: str = "en"
    body_parameters: List[str] = []
    header_parameters: List[str] = []
    header_type: Optional[str] = None


class TemplateCached(BaseModel):
    """Cached template model stored in MongoDB"""
    meta_id: str  # Template ID from Meta
    name: str
    language: str
    category: str
    status: str
    components: List[dict]  # Store full component structure
    last_synced_at: datetime
    created_at: Optional[datetime] = None


# Contacts
class ContactCreate(BaseModel):
    name: str
    phone: str
    list_ids: Optional[List[str]] = []


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    list_ids: Optional[List[str]] = None


class ContactPublic(BaseModel):
    id: str
    name: str
    phone: str
    list_ids: List[str] = []
    created_at: str


class ContactListCreate(BaseModel):
    name: str


class ContactListUpdate(BaseModel):
    name: Optional[str] = None



