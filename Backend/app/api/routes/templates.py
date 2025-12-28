import httpx
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone, timedelta

from app.core.security import get_current_user
from app.db.mongo import get_db
from app.services.templates import send_template_message
from config import settings
from models import TemplateCreate, TemplateRequest, UserPublic

router = APIRouter(tags=["templates"])

# IST timezone (UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30))

def utc_to_ist(utc_dt: datetime) -> datetime:
    """Convert UTC datetime to IST"""
    if utc_dt.tzinfo is None:
        utc_dt = utc_dt.replace(tzinfo=timezone.utc)
    return utc_dt.astimezone(IST)


async def sync_templates_from_meta(db):
    """Fetch templates from Meta API and store/update in MongoDB"""
    url = f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/{settings.WHATSAPP_WABA_ID}/message_templates"
    headers = {"Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}"}

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()

            templates_collection = db["templates"]
            synced_count = 0
            current_time = datetime.utcnow()

            # Get list of current template IDs from Meta
            meta_template_ids = set()

            for item in data.get("data", []):
                meta_template_id = item.get("id")
                meta_template_ids.add(meta_template_id)

                template_struct = {
                    "name": item.get("name"),
                    "language": item.get("language"),
                    "category": item.get("category"),
                    "meta_id": meta_template_id,
                    "status": item.get("status"),
                    "components": [],
                }

                for component in item.get("components", []):
                    comp_type = component.get("type")

                    if comp_type == "BODY":
                        text = component.get("text", "")
                        param_count = text.count("{{")
                        template_struct["components"].append(
                            {"type": "BODY", "text": text, "parameter_count": param_count}
                        )

                    elif comp_type == "HEADER":
                        fmt = component.get("format")
                        text = component.get("text", "")
                        param_count = text.count("{{") if fmt == "TEXT" else 0
                        template_struct["components"].append(
                            {"type": "HEADER", "format": fmt, "text": text, "parameter_count": param_count}
                        )

                    elif comp_type == "BUTTONS":
                        buttons = component.get("buttons", [])
                        template_struct["components"].append({"type": "BUTTONS", "buttons": buttons})

                # Upsert template (update if exists, insert if new)
                await templates_collection.update_one(
                    {"meta_id": meta_template_id},
                    {
                        "$set": {
                            **template_struct,
                            "last_synced_at": current_time,
                        },
                        "$setOnInsert": {"created_at": current_time}
                    },
                    upsert=True
                )
                synced_count += 1

            # Delete templates that no longer exist in Meta
            delete_result = await templates_collection.delete_many(
                {"meta_id": {"$nin": list(meta_template_ids)}}
            )

            return {
                "synced": synced_count,
                "deleted": delete_result.deleted_count,
                "last_synced_at": utc_to_ist(current_time).isoformat()
            }

        except httpx.HTTPStatusError as exc:
            print(f"Error syncing templates: {exc.response.text}")
            raise HTTPException(status_code=500, detail="Failed to sync templates from Meta")
        except Exception as exc:
            print(f"Unexpected error during sync: {str(exc)}")
            raise HTTPException(status_code=500, detail=str(exc))


@router.post("/templates/sync")
async def sync_templates(current_user: UserPublic = Depends(get_current_user), db = Depends(get_db)):
    """Manually trigger sync from Meta API to database"""
    result = await sync_templates_from_meta(db)
    return {"success": True, "message": "Templates synced successfully", "data": result}


@router.get("/templates")
async def get_templates(current_user: UserPublic = Depends(get_current_user), db = Depends(get_db)):
    """Get templates from database cache"""
    templates_collection = db["templates"]
    
    # Get all templates from DB
    cursor = templates_collection.find({})
    templates = await cursor.to_list(length=None)
    
    # Get the most recent sync time
    last_synced_at = None
    if templates:
        sorted_templates = sorted(templates, key=lambda x: x.get("last_synced_at", datetime.min), reverse=True)
        last_synced_at = sorted_templates[0].get("last_synced_at")
    
    # Format response
    result = []
    for template in templates:
        result.append({
            "name": template.get("name"),
            "language": template.get("language"),
            "category": template.get("category"),
            "id": template.get("meta_id"),
            "status": template.get("status"),
            "components": template.get("components", []),
        })
    
    return {
        "templates": result,
        "last_synced_at": utc_to_ist(last_synced_at).isoformat() if last_synced_at else None
    }


@router.get("/templates/{template_id}")
async def get_template(template_id: str, current_user: UserPublic = Depends(get_current_user)):
    url = f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/{template_id}"
    headers = {"Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}"}

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as exc:
            print(f"Error fetching template {template_id}: {exc.response.text}")
            raise HTTPException(status_code=404, detail="Template not found")
        except Exception as exc:
            print(f"Unexpected error: {str(exc)}")
            raise HTTPException(status_code=500, detail=str(exc))


@router.post("/templates/create")
async def create_template(req: TemplateCreate, current_user: UserPublic = Depends(get_current_user), db = Depends(get_db)):
    url = f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/{settings.WHATSAPP_WABA_ID}/message_templates"
    headers = {"Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}", "Content-Type": "application/json"}

    payload = req.model_dump()

    for component in payload.get("components", []):
        # Always strip stray header/location fields first to avoid leaking into non-header components
        handle = component.pop("header_handle", None)
        loc_lat = component.pop("location_latitude", None)
        loc_long = component.pop("location_longitude", None)
        loc_name = component.pop("location_name", None)
        loc_addr = component.pop("location_address", None)

        if component.get("type") == "HEADER":
            fmt = component.get("format")

            if fmt in ["IMAGE", "VIDEO", "DOCUMENT"]:
                if not handle:
                    raise HTTPException(status_code=400, detail=f"Header handle is required for {fmt} templates")
                component["example"] = {"header_handle": [handle]}
            elif fmt == "LOCATION":
                if loc_lat is not None and loc_long is not None:
                    component["example"] = {
                        "header_location": [{"latitude": str(loc_lat), "longitude": str(loc_long)}]
                    }
            else:
                # TEXT or other formats: no example payload expected
                pass

    async with httpx.AsyncClient(timeout=25.0) as client:
        response = await client.post(url, json=payload, headers=headers)

        try:
            data = response.json()
        except Exception:
            data = {}

        if response.status_code in (200, 201):
            # Sync templates after successful creation
            try:
                await sync_templates_from_meta(db)
            except Exception as sync_error:
                print(f"Warning: Template created but sync failed: {str(sync_error)}")
            
            return {"success": True, "message": "Template submitted successfully", "data": data}

        if "error" in data:
            # Surface Meta's message, avoid leaking unexpected keys in our payload
            print("Meta error:", data["error"])
            raise HTTPException(status_code=400, detail=data["error"].get("message", "Meta error"))

        raise HTTPException(status_code=response.status_code, detail="Failed to create template")


@router.delete("/templates")
async def delete_template(name: str, current_user: UserPublic = Depends(get_current_user), db = Depends(get_db)):
    url = f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/{settings.WHATSAPP_WABA_ID}/message_templates"
    headers = {"Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}"}
    params = {"name": name}

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.delete(url, headers=headers, params=params)

            if response.status_code in (200, 204):
                data = {}
                if response.text:
                    try:
                        data = response.json()
                    except Exception:
                        pass

                # Sync templates after successful deletion
                try:
                    await sync_templates_from_meta(db)
                except Exception as sync_error:
                    print(f"Warning: Template deleted but sync failed: {str(sync_error)}")

                return {"success": True, "message": "Template deleted successfully", "data": data}

            try:
                error_data = response.json()
                detail = error_data.get("error", {}).get("message", response.text)
            except Exception:
                detail = response.text
            raise HTTPException(status_code=response.status_code, detail=detail)

        except httpx.HTTPStatusError as exc:
            print(f"Error deleting template: {exc.response.text}")
            try:
                error_data = exc.response.json()
                detail = error_data.get("error", {}).get("message", exc.response.text)
            except Exception:
                detail = exc.response.text
            raise HTTPException(status_code=exc.response.status_code, detail=detail)
        except Exception as exc:
            print(f"Unexpected error: {str(exc)}")
            raise HTTPException(status_code=500, detail=str(exc))


@router.post("/send-template")
async def send_template(req: TemplateRequest, current_user: UserPublic = Depends(get_current_user)):
    return await send_template_message(req)
