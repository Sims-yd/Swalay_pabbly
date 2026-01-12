from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import httpx
from app.db.mongo import get_db
from app.core.security import get_current_user
from models import UserPublic, WhatsAppCredential
from config import settings
from datetime import datetime

router = APIRouter(prefix="/onboarding", tags=["onboarding"])

class WhatsAppSignupRequest(BaseModel):
    code: str

@router.post("/whatsapp/signup")
async def whatsapp_signup(
    payload: WhatsAppSignupRequest,
    current_user: UserPublic = Depends(get_current_user),
    db=Depends(get_db)
):
    async with httpx.AsyncClient() as client:
        # 1. Exchange code for access token
        token_url = f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/oauth/access_token"
        token_params = {
            "client_id": settings.WHATSAPP_APP_ID,
            "client_secret": settings.WHATSAPP_APP_SECRET,
            "code": payload.code
        }
        
        try:
            token_res = await client.get(token_url, params=token_params)
            token_res.raise_for_status()
            token_data = token_res.json()
            access_token = token_data.get("access_token")
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Failed to exchange token: {e.response.text}"
            )

        waba_id = None
        phone_number_id = None

        # 2. Fetch WABA ID
        # Try fetching accounts first (works if token has whatsapp_business_management)
        accounts_url = f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/me/accounts"
        accounts_headers = {"Authorization": f"Bearer {access_token}"}
        
        try:
            accounts_res = await client.get(accounts_url, headers=accounts_headers)
            if accounts_res.status_code == 200:
                accounts_data = accounts_res.json().get("data", [])
                for account in accounts_data:
                    # Check for WABA category or just take the first one if it looks like a WABA
                    # The category for WABA is usually not explicit in /me/accounts for all versions, 
                    # but usually it returns the WABA associated with the token.
                    # For Embedded Signup, the token is often scoped to the specific WABA.
                    if account.get("category") == "WhatsApp Business Account" or "id" in account:
                         waba_id = account.get("id")
                         break
        except Exception as e:
            print(f"Error fetching accounts: {e}")

        # Fallback: Use debug_token to find granularity
        if not waba_id:
            debug_url = f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/debug_token"
            debug_params = {
                "input_token": access_token,
                "access_token": f"{settings.WHATSAPP_APP_ID}|{settings.WHATSAPP_APP_SECRET}"
            }
            try:
                debug_res = await client.get(debug_url, params=debug_params)
                if debug_res.status_code == 200:
                    debug_data = debug_res.json().get("data", {})
                    target_ids = debug_data.get("granularity", [])
                    for target in target_ids:
                        if target.get("type") == "whatsapp_business_account":
                            waba_id = target.get("id")
                            break
            except Exception as e:
                print(f"Error debugging token: {e}")

        if not waba_id:
             raise HTTPException(status_code=400, detail="Could not resolve WABA ID from token")

        # 3. Fetch Phone Number ID
        phones_url = f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/{waba_id}/phone_numbers"
        phones_headers = {"Authorization": f"Bearer {access_token}"}
        
        try:
            phones_res = await client.get(phones_url, headers=phones_headers)
            if phones_res.status_code == 200:
                phones_data = phones_res.json().get("data", [])
                if phones_data:
                    # Just take the first one for now. 
                    # In a real app, you might want to list them if there are multiple.
                    phone_number_id = phones_data[0].get("id")
        except Exception as e:
             raise HTTPException(status_code=400, detail=f"Failed to fetch phone numbers: {e}")

        if not phone_number_id:
             raise HTTPException(status_code=400, detail="No phone number found for this WABA")

        # 4. Register phone number
        register_url = f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/{phone_number_id}/register"
        register_headers = {"Authorization": f"Bearer {access_token}"}
        register_data = {
            "messaging_product": "whatsapp",
            "pin": "123456" 
        }
        
        try:
            reg_res = await client.post(register_url, headers=register_headers, json=register_data)
            if reg_res.status_code != 200:
                print(f"Registration warning: {reg_res.text}")
        except Exception as e:
            print(f"Registration error: {e}")

        # 5. Subscribe to webhooks
        subscribe_url = f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/{waba_id}/subscribed_apps"
        sub_headers = {"Authorization": f"Bearer {access_token}"}
        
        try:
            sub_res = await client.post(subscribe_url, headers=sub_headers)
            if sub_res.status_code != 200:
                print(f"Webhook subscription failed: {sub_res.text}")
        except Exception as e:
            print(f"Webhook subscription error: {e}")

        # 6. Save credentials
        credential = WhatsAppCredential(
            user_id=str(current_user.id),
            waba_id=waba_id,
            phone_number_id=phone_number_id,
            access_token=access_token,
            created_at=datetime.utcnow()
        )
        
        await db["whatsapp_credentials"].update_one(
            {"user_id": str(current_user.id)},
            {"$set": credential.model_dump()},
            upsert=True
        )
        
        return {"status": "success", "waba_id": waba_id, "phone_number_id": phone_number_id}
