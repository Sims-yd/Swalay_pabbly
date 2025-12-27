import httpx
from fastapi import HTTPException

from config import settings
from models import TemplateRequest


async def fetch_header_image_url(template_id: str, client: httpx.AsyncClient) -> str:
    """Fetch the example header image URL for a template from Meta."""

    url = f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/{template_id}"
    headers = {"Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}"}
    params = {"phone_number_id": settings.WHATSAPP_PHONE_NUMBER_ID}

    try:
        resp = await client.get(url, headers=headers, params=params)
        resp.raise_for_status()
        data = resp.json()
    except httpx.HTTPStatusError as exc:
        print(f"Error fetching header image for template {template_id}: {exc.response.text}")
        raise HTTPException(status_code=exc.response.status_code, detail="Failed to fetch header media URL")
    except Exception as exc:
        print(f"Unexpected error fetching header image: {str(exc)}")
        raise HTTPException(status_code=500, detail="Unexpected error fetching header media URL")

    for component in data.get("components", []):
        if component.get("type") == "HEADER":
            example = component.get("example") or {}
            handles = example.get("header_handle") or []
            if handles:
                return handles[0]

    raise HTTPException(status_code=400, detail="Template header image URL not found")


async def send_template_message(req: TemplateRequest):
    if not req.phone or not req.template_name:
        raise HTTPException(status_code=400, detail="Phone and template name are required")

    url = f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient() as client:
        components = []

        if req.header_type:
            header_params = []
            header_type = req.header_type.upper()

            if header_type == "TEXT":
                header_params = [{"type": "text", "text": p} for p in req.header_parameters]
            elif header_type == "IMAGE":
                if not req.template_id:
                    raise HTTPException(status_code=400, detail="template_id is required for IMAGE headers")
                
                # Check if user provided a specific image (URL or ID)
                if req.header_parameters:
                    param = req.header_parameters[0]
                    if param.startswith("http"):
                        header_params.append({"type": "image", "image": {"link": param}})
                    else:
                        # Assume it's a media ID
                        header_params.append({"type": "image", "image": {"id": param}})
                else:
                    # Fallback to example image from template definition
                    image_url = await fetch_header_image_url(req.template_id, client)
                    header_params.append({"type": "image", "image": {"link": image_url}})
            elif header_type == "VIDEO" and req.header_parameters:
                param = req.header_parameters[0]
                if param.startswith("http"):
                    header_params.append({"type": "video", "video": {"link": param}})
                else:
                    header_params.append({"type": "video", "video": {"id": param}})
            elif header_type == "DOCUMENT" and req.header_parameters:
                param = req.header_parameters[0]
                if param.startswith("http"):
                    header_params.append({"type": "document", "document": {"link": param}})
                else:
                    header_params.append({"type": "document", "document": {"id": param}})

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
