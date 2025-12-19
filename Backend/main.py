from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from typing import List, Optional, Dict, Any
from config import settings

app = FastAPI()

# 2) Add CORS middleware (allow all origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    # Note: browsers will ignore credentials if origin is '*'.
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4) Implement endpoint: GET /health
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "whatsapp-backend"}

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
async def get_messages():
    return RECEIVED_MESSAGES

# 5) Implement endpoint: POST /send-message
class MessageRequest(BaseModel):
    phone: str
    message: str

@app.post("/send-message")
async def send_message(req: MessageRequest):
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
async def get_templates():
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
async def get_template(template_id: str):
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
class TemplateCreate(BaseModel):
    name: str
    category: str
    language: str
    parameter_format: Optional[str] = "POSITIONAL" # NAMED or POSITIONAL
    components: List[Dict[str, Any]]

@app.post("/templates/create")
async def create_template(req: TemplateCreate):

    url = f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/{settings.META_BUSINESS_ID}/message_templates"
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "name": req.name,
        "category": req.category,
        "language": req.language,
        "parameter_format": req.parameter_format,
        "components": req.components
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            return {"success": True, "data": response.json()}
        except httpx.HTTPStatusError as e:
             print(f"Error creating template: {e.response.text}")
             raise HTTPException(status_code=400, detail=f"Failed to create template: {e.response.text}")
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

@app.delete("/templates")
async def delete_template(name: str):
    # Meta API to delete by name: DELETE /{waba_id}/message_templates?name={name}
    url = f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/{settings.WHATSAPP_WABA_ID}/message_templates"
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
    }
    params = {"name": name}

    async with httpx.AsyncClient() as client:
        try:
            response = await client.delete(url, headers=headers, params=params)
            # Meta might return 200 even if not found, or error.
            if response.status_code != 200:
                 # Try deleting by ID if name fails? No, name is standard for WABA edge.
                 # Let's check error
                 print(f"Error deleting template: {response.text}")
                 raise HTTPException(status_code=400, detail=f"Failed to delete template: {response.text}")
            
            return {"success": True, "message": "Template deleted successfully"}
        except httpx.HTTPStatusError as e:
             print(f"Error deleting template: {e.response.text}")
             raise HTTPException(status_code=400, detail=f"Failed to delete template: {e.response.text}")
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

# 7) Implement endpoint: POST /send-template
class TemplateRequest(BaseModel):
    phone: str
    template_name: str
    language_code: str = "en"
    body_parameters: List[str] = []
    header_parameters: List[str] = []  # For TEXT params or Media URLs
    header_type: Optional[str] = None  # IMAGE, VIDEO, DOCUMENT, TEXT, or None

@app.post("/send-template")
async def send_template(req: TemplateRequest):
    if not req.phone or not req.template_name:
        raise HTTPException(status_code=400, detail="Phone and template name are required")

    url = f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }

    components = []

    # 1) Handle Header
    if req.header_type:
        header_params = []
        if req.header_type == "TEXT":
             header_params = [{"type": "text", "text": p} for p in req.header_parameters]
        elif req.header_type == "IMAGE":
             if req.header_parameters:
                 header_params.append({"type": "image", "image": {"link": req.header_parameters[0]}})
        elif req.header_type == "VIDEO":
             if req.header_parameters:
                 header_params.append({"type": "video", "video": {"link": req.header_parameters[0]}})
        elif req.header_type == "DOCUMENT":
             if req.header_parameters:
                 header_params.append({"type": "document", "document": {"link": req.header_parameters[0]}})

        if header_params:
            components.append({
                "type": "header",
                "parameters": header_params
            })

    # 2) Handle Body
    if req.body_parameters:
        body_params = [{"type": "text", "text": p} for p in req.body_parameters]
        components.append({
            "type": "body",
            "parameters": body_params
        })

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": req.phone,
        "type": "template",
        "template": {
            "name": req.template_name,
            "language": {
                "code": req.language_code
            },
            "components": components
        }
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


# ----------------------- Broadcasts (new) -----------------------
from uuid import uuid4
import asyncio
from datetime import datetime

RATE_LIMIT_PER_SECOND = 1  # messages per second

BROADCASTS = []  # In-memory store: each broadcast is a dict

class BroadcastRequest(BaseModel):
    name: str
    phones: List[str]
    template_name: str
    template_id: Optional[str] = None
    language_code: str = "en"
    body_parameters: List[str] = []
    header_parameters: List[str] = []
    header_type: Optional[str] = None


@app.post("/broadcasts")
async def create_broadcast(req: BroadcastRequest):
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

    # Send messages respecting rate limits
    url = f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient() as client:
        for idx, recipient in enumerate(broadcast["recipients"]):
            phone = recipient["phone"]

            components = []
            if req.header_type:
                header_params = []
                if req.header_type == "TEXT":
                    header_params = [{"type": "text", "text": p} for p in req.header_parameters]
                elif req.header_type == "IMAGE" and req.header_parameters:
                    header_params.append({"type": "image", "image": {"link": req.header_parameters[0]}})
                if header_params:
                    components.append({"type": "header", "parameters": header_params})

            if req.body_parameters:
                body_params = [{"type": "text", "text": p} for p in req.body_parameters]
                components.append({"type": "body", "parameters": body_params})

            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": phone,
                "type": "template",
                "template": {
                    "name": req.template_name,
                    "language": {"code": req.language_code},
                    "components": components
                }
            }

            try:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                res_json = response.json()
                recipient["status"] = "sent"
                recipient["details"] = res_json
            except httpx.HTTPStatusError as e:
                print(f"Error sending to {phone}: {e.response.text}")
                recipient["status"] = "failed"
                try:
                    recipient["details"] = e.response.json()
                except Exception:
                    recipient["details"] = {"error": e.response.text}
            except Exception as e:
                print(f"Unexpected error sending to {phone}: {str(e)}")
                recipient["status"] = "failed"
                recipient["details"] = {"error": str(e)}

            # Rate limit between sends
            await asyncio.sleep(1.0 / RATE_LIMIT_PER_SECOND)

    # After sending all messages, return summary
    sent = sum(1 for r in broadcast["recipients"] if r["status"] == "sent")
    failed = sum(1 for r in broadcast["recipients"] if r["status"] == "failed")

    return {"id": broadcast_id, "total": len(broadcast["recipients"]), "sent": sent, "failed": failed, "broadcast": broadcast}


@app.get("/broadcasts")
async def list_broadcasts():
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
async def get_broadcast(broadcast_id: str):
    for b in BROADCASTS:
        if b["id"] == broadcast_id:
            return b
    raise HTTPException(status_code=404, detail="Broadcast not found")

