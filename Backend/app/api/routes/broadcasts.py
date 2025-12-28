import asyncio
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_user
from app.services.templates import send_template_message
from app.db.mongo import get_db
from models import BroadcastRequest, TemplateRequest, UserPublic

router = APIRouter(tags=["broadcasts"])

RATE_LIMIT_PER_SECOND = 1


@router.post("/broadcasts")
async def create_broadcast(req: BroadcastRequest, current_user: UserPublic = Depends(get_current_user), db = Depends(get_db)):
    if not req.phones or not req.template_name:
        raise HTTPException(status_code=400, detail="Phones and template_name are required")

    broadcast_id = str(uuid4())
    now = datetime.utcnow()
    broadcast = {
        "_id": broadcast_id,
        "id": broadcast_id,
        "user_id": current_user.id,
        "name": req.name,
        "template_name": req.template_name,
        "template_id": req.template_id,
        "language_code": req.language_code,
        "created_at": now.isoformat(),
        "sent_at": None,
        "completed_at": None,
        "status": "pending",
        "recipients": [{"phone": phone, "status": "pending", "details": None} for phone in req.phones],
        "total": len(req.phones),
        "sent": 0,
        "failed": 0,
        "pending": len(req.phones),
    }

    # Insert broadcast into database
    await db.broadcasts.insert_one(broadcast)

    # Update status to sending
    await db.broadcasts.update_one(
        {"_id": broadcast_id},
        {"$set": {"status": "sending", "sent_at": datetime.utcnow().isoformat()}}
    )

    for idx, recipient in enumerate(broadcast["recipients"]):
        try:
            template_req = TemplateRequest(
                phone=recipient["phone"],
                template_name=req.template_name,
                template_id=req.template_id,
                language_code=req.language_code,
                body_parameters=req.body_parameters,
                header_parameters=req.header_parameters,
                header_type=req.header_type,
            )

            res = await send_template_message(template_req)

            if isinstance(res, dict) and res.get("success"):
                recipient["status"] = "sent"
                recipient["details"] = res.get("whatsapp_response")
            else:
                recipient["status"] = "failed"
                recipient["details"] = res.get("details") if isinstance(res, dict) else {"error": "Unknown error"}
        except Exception as exc:
            print(f"Unexpected error sending to {recipient['phone']}: {str(exc)}")
            recipient["status"] = "failed"
            recipient["details"] = {"error": str(exc)}

        # Update database after each recipient
        sent = sum(1 for r in broadcast["recipients"] if r["status"] == "sent")
        failed = sum(1 for r in broadcast["recipients"] if r["status"] == "failed")
        pending = sum(1 for r in broadcast["recipients"] if r["status"] == "pending")
        
        await db.broadcasts.update_one(
            {"_id": broadcast_id},
            {"$set": {
                "recipients": broadcast["recipients"],
                "sent": sent,
                "failed": failed,
                "pending": pending
            }}
        )

        await asyncio.sleep(1.0 / RATE_LIMIT_PER_SECOND)

    # Final update with completed status
    sent = sum(1 for r in broadcast["recipients"] if r["status"] == "sent")
    failed = sum(1 for r in broadcast["recipients"] if r["status"] == "failed")
    
    await db.broadcasts.update_one(
        {"_id": broadcast_id},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.utcnow().isoformat(),
            "sent": sent,
            "failed": failed,
            "pending": 0
        }}
    )

    return {"id": broadcast_id, "total": len(broadcast["recipients"]), "sent": sent, "failed": failed, "broadcast": broadcast}


@router.get("/broadcasts")
async def list_broadcasts(current_user: UserPublic = Depends(get_current_user), db = Depends(get_db)):
    # Fetch broadcasts for the current user, sorted by created_at descending
    cursor = db.broadcasts.find({"user_id": current_user.id}).sort("created_at", -1)
    broadcasts = await cursor.to_list(length=None)
    
    summaries = []
    for broadcast in broadcasts:
        summaries.append(
            {
                "id": broadcast["id"],
                "name": broadcast["name"],
                "template_name": broadcast.get("template_name"),
                "total": broadcast.get("total", 0),
                "sent": broadcast.get("sent", 0),
                "failed": broadcast.get("failed", 0),
                "pending": broadcast.get("pending", 0),
                "status": broadcast.get("status", "unknown"),
                "created_at": broadcast.get("created_at"),
                "sent_at": broadcast.get("sent_at"),
                "completed_at": broadcast.get("completed_at"),
            }
        )
    return summaries


@router.get("/broadcasts/{broadcast_id}")
async def get_broadcast(broadcast_id: str, current_user: UserPublic = Depends(get_current_user), db = Depends(get_db)):
    broadcast = await db.broadcasts.find_one({"_id": broadcast_id, "user_id": current_user.id})
    if not broadcast:
        raise HTTPException(status_code=404, detail="Broadcast not found")
    return broadcast
