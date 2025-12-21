import asyncio
from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4

import httpx
from bson import ObjectId
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from pymongo.errors import DuplicateKeyError


from config import settings
from models import (
    BroadcastRequest,
    MessageRequest,
    TemplateCreate,
    TemplateRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserPublic,
)

app = FastAPI()
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)
TOKEN_COOKIE_NAME = "access_token"

allowed_origins = [o.strip() for o in settings.FRONTEND_ORIGIN.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or [],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_db_client():
    app.state.mongo_client = AsyncIOMotorClient(settings.MONGODB_URI)
    app.state.db = app.state.mongo_client[settings.MONGODB_DB_NAME]


@app.on_event("shutdown")
async def shutdown_db_client():
    mongo_client = getattr(app.state, "mongo_client", None)
    if mongo_client:
        mongo_client.close()


async def get_db(request: Request):
    db = getattr(request.app.state, "db", None)
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    return db


def sanitize_user(user_doc) -> UserPublic:
    return UserPublic(
        id=str(user_doc["_id"]),
        email=user_doc["email"],
        created_at=user_doc["created_at"],
    )

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return pwd_context.verify(password, hashed_password)


def create_access_token(subject: str, email: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRES_IN_MINUTES)
    to_encode = {"sub": subject, "email": email, "exp": expire}
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

async def get_user_by_email(email: str, db):
    return await db["users"].find_one({"email": email})


async def get_current_user(request: Request, token: Optional[str] = Depends(oauth2_scheme)) -> UserPublic:
    raw_token = token
    if not raw_token:
        raw_token = request.cookies.get(TOKEN_COOKIE_NAME)

    if not raw_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        payload = jwt.decode(raw_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        if user_id is None or email is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    db = await get_db(request)
    try:
        object_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = await db["users"].find_one({"_id": object_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return sanitize_user(user)


async def authenticate_user(email: str, password: str, db):
    user = await get_user_by_email(email, db)
    if not user:
        return None
    if not verify_password(password, user["hashed_password"]):
        return None
    return user


def set_auth_cookie(response: JSONResponse, token: str):
    response.set_cookie(
        key=TOKEN_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.JWT_EXPIRES_IN_MINUTES * 60,
        path="/",
    )

# 4) Implement endpoint: GET /health
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "whatsapp-backend"}


@app.post("/auth/signup", response_model=TokenResponse)
async def signup(payload: UserCreate, request: Request):
    db = await get_db(request)
    existing = await get_user_by_email(payload.email, db)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user_doc = {
        "email": payload.email,
        "hashed_password": hash_password(payload.password),
        "created_at": datetime.utcnow().isoformat(),
    }

    try:
        result = await db["users"].insert_one(user_doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user_doc["_id"] = result.inserted_id
    token = create_access_token(str(result.inserted_id), payload.email)
    response = JSONResponse({
        "access_token": token,
        "token_type": "bearer",
        "user": sanitize_user(user_doc).model_dump(),
    })
    set_auth_cookie(response, token)
    return response


@app.post("/auth/login", response_model=TokenResponse)
async def login(payload: UserLogin, request: Request):
    db = await get_db(request)
    user = await authenticate_user(payload.email, payload.password, db)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(str(user["_id"]), user["email"])
    response = JSONResponse({
        "access_token": token,
        "token_type": "bearer",
        "user": sanitize_user(user).model_dump(),
    })
    set_auth_cookie(response, token)
    return response


@app.get("/auth/me", response_model=UserPublic)
async def get_me(current_user: UserPublic = Depends(get_current_user)):
    return current_user


@app.post("/auth/logout")
async def logout():
    response = JSONResponse({"detail": "Logged out"})
    response.delete_cookie(key=TOKEN_COOKIE_NAME, path="/")
    return response

# 1) Preserve and slightly harden the existing webhook
# In-memory storage for received messages
RECEIVED_MESSAGES = []

@app.get("/webhook")
async def verify(request: Request):
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    if mode == "subscribe" and token == settings.VERIFY_TOKEN:
        return PlainTextResponse(challenge, status_code=200)
    else:
        return PlainTextResponse("Error, wrong token", status_code=403)

@app.post("/webhook")
async def webhook_received(request: Request):
    try:
        data = await request.json()
        print("RAW DATA =", data)
        
        # Extract relevant info and store
        if data.get("entry"):
            for entry in data["entry"]:
                for change in entry.get("changes", []):
                        value = change.get("value", {})
                        
                        # Handle Incoming Messages
                        if value.get("messages"):
                            for msg in value["messages"]:
                                message_data = {
                                    "type": "message",
                                    "direction": "incoming",
                                    "from": msg.get("from"),
                                    "id": msg.get("id"),
                                    "timestamp": msg.get("timestamp"),
                                    "text": msg.get("text", {}).get("body"),
                                    "msg_type": msg.get("type"),
                                    "raw": msg
                                }
                                # Add contact info if available
                                if value.get("contacts"):
                                    message_data["contact"] = value["contacts"][0]
                                    
                                RECEIVED_MESSAGES.append(message_data)

                        # Handle Status Updates (Sent, Delivered, Read)
                        if value.get("statuses"):
                            for status in value["statuses"]:
                                status_data = {
                                    "type": "status",
                                    "id": status.get("id"),
                                    "status": status.get("status"),
                                    "timestamp": status.get("timestamp"),
                                    "recipient_id": status.get("recipient_id"),
                                    "raw": status
                                }
                                RECEIVED_MESSAGES.append(status_data)

                        # Keep only last 100 events
                        if len(RECEIVED_MESSAGES) > 100:
                            RECEIVED_MESSAGES.pop(0)
                                
    except Exception as e:
        print(f"⚠️ Error processing webhook: {e}")
    
    return {"status": "ok"}

@app.get("/messages")
async def get_messages(current_user: UserPublic = Depends(get_current_user)):
    return RECEIVED_MESSAGES

# 5) Implement endpoint: POST /send-message
@app.post("/send-message")
async def send_message(
    req: MessageRequest, current_user: UserPublic = Depends(get_current_user)
):
    if not req.phone or not req.message:
        raise HTTPException(status_code=400, detail="Phone and message are required")

    url = f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": req.phone,
        "type": "text",
        "text": {
            "preview_url": False,
            "body": req.message
        }
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            return {"success": True, "whatsapp_response": response.json()}
        except httpx.HTTPStatusError as e:
            print(f"Error sending message: {e.response.text}")
            return {"success": False, "error": "Failed to send message", "details": e.response.json()}
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            return {"success": False, "error": "Unexpected error", "details": {"message": str(e)}}

# 6) Implement endpoint: GET /templates
@app.get("/templates")
async def get_templates(current_user: UserPublic = Depends(get_current_user)):
    url = f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/{settings.WHATSAPP_WABA_ID}/message_templates"
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            templates = []
            for item in data.get("data", []):
                # if item.get("status") == "APPROVED":  <-- Removed filter
                template_struct = {
                    "name": item.get("name"),
                    "language": item.get("language"),
                    "category": item.get("category"),
                    "id": item.get("id"),
                    "status": item.get("status"), # Added status
                    "components": []
                }
                    
                for component in item.get("components", []):
                    comp_type = component.get("type")
                    
                    if comp_type == "BODY":
                        text = component.get("text", "")
                        # Count {{x}} variables
                        param_count = text.count("{{")
                        template_struct["components"].append({
                            "type": "BODY",
                            "text": text,
                            "parameter_count": param_count
                        })
                        
                    elif comp_type == "HEADER":
                        fmt = component.get("format")  # TEXT, IMAGE, VIDEO, DOCUMENT
                        text = component.get("text", "")
                        param_count = 0
                        if fmt == "TEXT":
                            param_count = text.count("{{")
                        
                        template_struct["components"].append({
                            "type": "HEADER",
                            "format": fmt,
                            "text": text,
                            "parameter_count": param_count
                        })
                        
                    elif comp_type == "BUTTONS":
                        buttons = component.get("buttons", [])
                        template_struct["components"].append({
                            "type": "BUTTONS",
                            "buttons": buttons
                        })
                
                templates.append(template_struct)
            return templates
        except httpx.HTTPStatusError as e:
             print(f"Error fetching templates: {e.response.text}")
             raise HTTPException(status_code=500, detail="Failed to fetch templates")
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

# 6.1) Implement endpoint: GET /templates/{template_id}
@app.get("/templates/{template_id}")
async def get_template(
    template_id: str, current_user: UserPublic = Depends(get_current_user)
):
    url = f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/{template_id}"
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
             print(f"Error fetching template {template_id}: {e.response.text}")
             raise HTTPException(status_code=404, detail="Template not found")
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

# 6.3) Implement endpoint: POST /templates/create (Create New)
@app.post("/templates/create")
async def create_template(
    req: TemplateCreate, current_user: UserPublic = Depends(get_current_user)
):

    url = f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/{settings.WHATSAPP_WABA_ID}/message_templates"
    
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }

    payload = req.model_dump()

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)

        # Parse JSON safely
        try:
            data = response.json()
        except Exception:
            data = {}

        # ✅ SUCCESS CASES
        if response.status_code in (200, 201):
            return {
                "success": True,
                "message": "Template submitted successfully",
                "data": data
            }

        # ⚠️ Meta sometimes returns error object with non-200 status
        if "error" in data:
            print("Meta error:", data["error"])
            raise HTTPException(
                status_code=400,
                detail=data["error"]["message"]
            )

        # ❌ Fallback (unexpected)
        raise HTTPException(
            status_code=response.status_code,
            detail="Failed to create template"
        )


@app.delete("/templates")
async def delete_template(name: str, current_user: UserPublic = Depends(get_current_user)):
    # Meta API to delete by name: DELETE /v18.0/{waba_id}/message_templates?name={name}
    url = f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/{settings.WHATSAPP_WABA_ID}/message_templates"
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
    }
    params = {"name": name}

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.delete(url, headers=headers, params=params)
            
            # Check status code first
            if response.status_code in (200, 204):
                # Try to parse JSON if available
                data = {}
                if response.text:
                    try:
                        data = response.json()
                    except Exception:
                        pass
                
                return {"success": True, "message": "Template deleted successfully", "data": data}
            else:
                # Handle error responses
                try:
                    error_data = response.json()
                    detail = error_data.get("error", {}).get("message", response.text)
                except Exception:
                    detail = response.text
                raise HTTPException(status_code=response.status_code, detail=detail)
                
        except httpx.HTTPStatusError as e:
            print(f"Error deleting template: {e.response.text}")
            try:
                error_data = e.response.json()
                detail = error_data.get("error", {}).get("message", e.response.text)
            except Exception:
                detail = e.response.text
            raise HTTPException(status_code=e.response.status_code, detail=detail)
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

async def send_template_message(req: TemplateRequest):
    if not req.phone or not req.template_name:
        raise HTTPException(status_code=400, detail="Phone and template name are required")

    url = f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }

    components = []

    if req.header_type:
        header_params = []
        if req.header_type == "TEXT":
            header_params = [{"type": "text", "text": p} for p in req.header_parameters]
        elif req.header_type == "IMAGE" and req.header_parameters:
            header_params.append({"type": "image", "image": {"link": req.header_parameters[0]}})
        elif req.header_type == "VIDEO" and req.header_parameters:
            header_params.append({"type": "video", "video": {"link": req.header_parameters[0]}})
        elif req.header_type == "DOCUMENT" and req.header_parameters:
            header_params.append({"type": "document", "document": {"link": req.header_parameters[0]}})

        if header_params:
            components.append({"type": "header", "parameters": header_params})

    if req.body_parameters:
        body_params = [{"type": "text", "text": p} for p in req.body_parameters]
        components.append({"type": "body", "parameters": body_params})

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": req.phone,
        "type": "template",
        "template": {
            "name": req.template_name,
            "language": {"code": req.language_code},
            "components": components,
        },
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            return {"success": True, "whatsapp_response": response.json()}
        except httpx.HTTPStatusError as e:
            print(f"Error sending template: {e.response.text}")
            return {"success": False, "error": "Failed to send template", "details": e.response.json()}
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            return {"success": False, "error": "Unexpected error", "details": {"message": str(e)}}


# 7) Implement endpoint: POST /send-template
@app.post("/send-template")
async def send_template(
    req: TemplateRequest, current_user: UserPublic = Depends(get_current_user)
):
    return await send_template_message(req)


# ----------------------- Broadcasts (new) -----------------------

RATE_LIMIT_PER_SECOND = 1  # messages per second

BROADCASTS = []  # In-memory store: each broadcast is a dict


@app.post("/broadcasts")
async def create_broadcast(
    req: BroadcastRequest, current_user: UserPublic = Depends(get_current_user)
):
    if not req.phones or not req.template_name:
        raise HTTPException(status_code=400, detail="Phones and template_name are required")

    broadcast_id = str(uuid4())
    broadcast = {
        "id": broadcast_id,
        "name": req.name,
        "template_name": req.template_name,
        "template_id": req.template_id,
        "language_code": req.language_code,
        "created_at": datetime.utcnow().isoformat(),
        "recipients": [{"phone": p, "status": "pending", "details": None} for p in req.phones]
    }

    BROADCASTS.append(broadcast)

    # Send messages respecting rate limits by re-using `send_template` logic
    for recipient in broadcast["recipients"]:
        try:
            template_req = TemplateRequest(
                phone=recipient["phone"],
                template_name=req.template_name,
                language_code=req.language_code,
                body_parameters=req.body_parameters,
                header_parameters=req.header_parameters,
                header_type=req.header_type
            )

            res = await send_template_message(template_req)

            if isinstance(res, dict) and res.get("success"):
                recipient["status"] = "sent"
                recipient["details"] = res.get("whatsapp_response")
            else:
                recipient["status"] = "failed"
                # Keep any details provided by send_template
                recipient["details"] = res.get("details") if isinstance(res, dict) else {"error": "Unknown error"}
        except Exception as e:
            print(f"Unexpected error sending to {recipient['phone']}: {str(e)}")
            recipient["status"] = "failed"
            recipient["details"] = {"error": str(e)}

        # Rate limit between sends
        await asyncio.sleep(1.0 / RATE_LIMIT_PER_SECOND)

    # After sending all messages, return summary
    sent = sum(1 for r in broadcast["recipients"] if r["status"] == "sent")
    failed = sum(1 for r in broadcast["recipients"] if r["status"] == "failed")

    return {"id": broadcast_id, "total": len(broadcast["recipients"]), "sent": sent, "failed": failed, "broadcast": broadcast}


@app.get("/broadcasts")
async def list_broadcasts(current_user: UserPublic = Depends(get_current_user)):
    summaries = []
    for b in BROADCASTS:
        sent = sum(1 for r in b["recipients"] if r["status"] == "sent")
        failed = sum(1 for r in b["recipients"] if r["status"] == "failed")
        pending = sum(1 for r in b["recipients"] if r["status"] == "pending")
        summaries.append({
            "id": b["id"],
            "name": b["name"],
            "template_name": b.get("template_name"),
            "total": len(b["recipients"]),
            "sent": sent,
            "failed": failed,
            "pending": pending,
            "status": "completed" if pending == 0 else "in-progress",
            "created_at": b.get("created_at")
        })
    return summaries


@app.get("/broadcasts/{broadcast_id}")
async def get_broadcast(
    broadcast_id: str, current_user: UserPublic = Depends(get_current_user)
):
    for b in BROADCASTS:
        if b["id"] == broadcast_id:
            return b
    raise HTTPException(status_code=404, detail="Broadcast not found")

