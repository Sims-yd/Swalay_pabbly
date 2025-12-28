from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, broadcasts, media, messages, templates, webhook
from app.api.routes import contacts, contact_lists
from app.db.mongo import close_mongo, connect_to_mongo
from app.sockets import create_socket_app
from config import settings

app = FastAPI()

allowed_origins = [origin.strip() for origin in settings.FRONTEND_ORIGIN.split(",") if origin.strip()]

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
    await connect_to_mongo(app)


@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo(app)


app.include_router(auth.router)
app.include_router(webhook.router)
app.include_router(messages.router)
app.include_router(templates.router)
app.include_router(media.router)
app.include_router(broadcasts.router)
app.include_router(contacts.router)
app.include_router(contact_lists.router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "whatsapp-backend"}


socket_app = create_socket_app(app)