from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from pymongo.errors import DuplicateKeyError

from app.core.security import (
    authenticate_user,
    clear_auth_cookie,
    create_access_token,
    get_current_user,
    hash_password,
    sanitize_user,
    set_auth_cookie,
)
from app.db.mongo import get_db
from app.services.users import get_user_by_email
from models import TokenResponse, UserCreate, UserLogin, UserPublic, FacebookLoginRequest

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
async def signup(payload: UserCreate, db=Depends(get_db)):
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
    response = JSONResponse(
        {
            "access_token": token,
            "token_type": "bearer",
            "user": sanitize_user(user_doc).model_dump(),
        }
    )
    set_auth_cookie(response, token)
    return response


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db=Depends(get_db)):
    user = await authenticate_user(payload.email, payload.password, db)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(str(user["_id"]), user["email"])
    response = JSONResponse(
        {
            "access_token": token,
            "token_type": "bearer",
            "user": sanitize_user(user).model_dump(),
        }
    )
    set_auth_cookie(response, token)
    return response


@router.get("/me", response_model=UserPublic)
async def get_me(current_user: UserPublic = Depends(get_current_user)):
    return current_user


@router.post("/logout")
async def logout():
    response = JSONResponse({"detail": "Logged out"})
    clear_auth_cookie(response)
    return response


@router.post("/facebook", response_model=TokenResponse)
async def facebook_login(payload: FacebookLoginRequest, db=Depends(get_db)):
    # 1. Verify token with Facebook
    # We should ideally call FB Graph API here to ensure the token is valid for the app
    # and matches the claimed facebook_id.
    
    import httpx
    
    # Use existing config settings
    from config import settings
    
    async with httpx.AsyncClient() as client:
        # Verify the token and get user info
        # We request id, name, email
        fb_url = f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/me"
        params = {
            "fields": "id,name,email",
            "access_token": payload.access_token
        }
        
        try:
            res = await client.get(fb_url, params=params)
            res.raise_for_status()
            fb_data = res.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail=f"Invalid Facebook Token: {e.response.text}"
            )
            
        # Verify the ID matches what was sent (optional security check)
        if fb_data.get("id") != payload.facebook_id:
             raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Facebook ID mismatch"
            )
            
    # 2. Check if user exists by Facebook ID OR Email
    email = fb_data.get("email") or payload.email
    
    if not email:
        # Without email, we can't easily link accounts or send emails. 
        # For now, we require email.
        raise HTTPException(status_code=400, detail="Email permission required from Facebook")

    user = await db["users"].find_one({
        "$or": [
            {"facebook_id": payload.facebook_id},
            {"email": email}
        ]
    })
    
    if user:
        # Update facebook_id if not present (linking accounts)
        if "facebook_id" not in user:
            await db["users"].update_one(
                {"_id": user["_id"]},
                {"$set": {"facebook_id": payload.facebook_id}}
            )
            user["facebook_id"] = payload.facebook_id
    else:
        # Create new user
        user_doc = {
            "email": email,
            "name": fb_data.get("name"),
            "facebook_id": payload.facebook_id,
            "created_at": datetime.utcnow().isoformat(),
            # No password for OAuth users
        }
        result = await db["users"].insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
        user = user_doc

    # 3. Generate Token
    token = create_access_token(str(user["_id"]), user["email"])
    response = JSONResponse(
        {
            "access_token": token,
            "token_type": "bearer",
            "user": sanitize_user(user).model_dump(),
        }
    )
    set_auth_cookie(response, token)
    return response
