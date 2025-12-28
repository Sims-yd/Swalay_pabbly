from typing import List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_user
from app.db.mongo import get_db
from models import ContactListCreate, ContactListUpdate, UserPublic


router = APIRouter(prefix="/contacts/lists", tags=["contact-lists"])


def _oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")


def _sanitize_list(doc):
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name", ""),
        "created_at": doc.get("created_at", ""),
    }


@router.post("", response_model=dict)
async def create_list(payload: ContactListCreate, current_user: UserPublic = Depends(get_current_user), db=Depends(get_db)):
    user_oid = _oid(current_user.id)
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    existing = await db["contact_lists"].find_one({"user_id": user_oid, "name": name})
    if existing:
        raise HTTPException(status_code=409, detail="List with this name already exists")

    doc = {
        "user_id": user_oid,
        "name": name,
        "created_at": __import__("datetime").datetime.utcnow().isoformat(),
    }
    res = await db["contact_lists"].insert_one(doc)
    doc["_id"] = res.inserted_id
    return _sanitize_list(doc)


@router.get("", response_model=dict)
async def list_lists(current_user: UserPublic = Depends(get_current_user), db=Depends(get_db)):
    user_oid = _oid(current_user.id)
    lists_cursor = db["contact_lists"].find({"user_id": user_oid}).sort("created_at", -1)
    lists = [l async for l in lists_cursor]
    # Counts per list via aggregation on contacts
    counts = {}
    pipeline = [
        {"$match": {"user_id": user_oid}},
        {"$unwind": "$list_ids"},
        {"$group": {"_id": "$list_ids", "count": {"$sum": 1}}},
    ]
    async for row in db["contacts"].aggregate(pipeline):
        counts[str(row["_id"])] = row["count"]

    return {
        "lists": [{**_sanitize_list(l), "contact_count": counts.get(str(l["_id"]), 0)} for l in lists],
    }


@router.patch("/{list_id}", response_model=dict)
async def update_list(list_id: str, payload: ContactListUpdate, current_user: UserPublic = Depends(get_current_user), db=Depends(get_db)):
    user_oid = _oid(current_user.id)
    lid = _oid(list_id)
    updates = {}
    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        updates["name"] = name

    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")

    doc = await db["contact_lists"].find_one_and_update(
        {"_id": lid, "user_id": user_oid},
        {"$set": updates},
        return_document=True,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="List not found")
    return _sanitize_list(doc)


@router.delete("/{list_id}")
async def delete_list(list_id: str, current_user: UserPublic = Depends(get_current_user), db=Depends(get_db)):
    user_oid = _oid(current_user.id)
    lid = _oid(list_id)
    res = await db["contact_lists"].delete_one({"_id": lid, "user_id": user_oid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="List not found")
    # Pull list id from contacts
    await db["contacts"].update_many({"user_id": user_oid}, {"$pull": {"list_ids": lid}})
    return {"success": True}


@router.get("/{list_id}/contacts", response_model=List[dict])
async def get_list_contacts(list_id: str, current_user: UserPublic = Depends(get_current_user), db=Depends(get_db)):
    user_oid = _oid(current_user.id)
    lid = _oid(list_id)
    cursor = db["contacts"].find({"user_id": user_oid, "list_ids": lid})
    docs = [d async for d in cursor]
    return [{
        "id": str(d["_id"]),
        "name": d.get("name", ""),
        "phone": d.get("phone", ""),
        "created_at": d.get("created_at", ""),
    } for d in docs]
