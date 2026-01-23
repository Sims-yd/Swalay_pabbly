from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api.routes import auth, broadcasts, media, messages, templates, webhook, onboarding, profile
from app.api.routes import contacts, contact_lists, chatbot
from app.db.mongo import close_mongo, connect_to_mongo
from app.sockets import create_socket_app
from config import settings

import logging
import time
from fastapi import Request

# Configure global logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo(app)
    yield
    # Shutdown
    await close_mongo(app)

app = FastAPI(lifespan=lifespan)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Generate or extract flow_id for correlation if present in headers or body (body is hard to read in middleware without consuming it)
    # For now, we'll just log the URL and Method.
    
    logger.info(f"Incoming Request: {request.method} {request.url}")
    
    try:
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000
        logger.info(
            f"Request Completed: {request.method} {request.url} "
            f"- Status: {response.status_code} - Time: {process_time:.2f}ms"
        )
        return response
    except Exception as e:
        process_time = (time.time() - start_time) * 1000
        logger.error(
            f"Request Failed: {request.method} {request.url} "
            f"- Time: {process_time:.2f}ms - Error: {str(e)}",
            exc_info=True
        )
        raise

allowed_origins = [origin.strip() for origin in settings.FRONTEND_ORIGIN.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or [],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router)
app.include_router(webhook.router)
app.include_router(messages.router)
app.include_router(templates.router)
app.include_router(media.router)
app.include_router(broadcasts.router)
app.include_router(contacts.router)
app.include_router(contact_lists.router)
app.include_router(onboarding.router)
app.include_router(profile.router)
app.include_router(chatbot.router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "whatsapp-backend"}


socket_app = create_socket_app(app)