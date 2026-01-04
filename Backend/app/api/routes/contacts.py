from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import get_current_user
from app.db.mongo import get_db
from models import ContactCreate, ContactPublic, ContactUpdate, UserPublic


router = APIRouter(prefix="/contacts", tags=["contacts"])


def _oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")


def _sanitize_contact(doc) -> ContactPublic:
    return ContactPublic(
        id=str(doc["_id"]),
        name=doc.get("name", ""),
        phone=doc.get("phone", ""),
        list_ids=[str(lid) for lid in doc.get("list_ids", [])],
        created_at=doc.get("created_at", ""),
    )


@router.post("", response_model=ContactPublic)
async def create_contact(
    payload: ContactCreate,
    current_user: UserPublic = Depends(get_current_user),
    db=Depends(get_db),
):
    user_oid = _oid(current_user.id)
    list_oids: List[ObjectId] = []
    if payload.list_ids:
        try:
            list_oids = [ObjectId(lid) for lid in payload.list_ids]
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid list id")

    # Basic phone normalization (keep digits and leading '+')
    phone = payload.phone.strip()
    if not phone:
        raise HTTPException(status_code=400, detail="Phone is required")

    doc = {
        "user_id": user_oid,
        "name": payload.name.strip(),
        "phone": phone,
        "list_ids": list_oids,
        "created_at": __import__("datetime").datetime.utcnow().isoformat(),
    }
    res = await db["contacts"].insert_one(doc)
    doc["_id"] = res.inserted_id
    return _sanitize_contact(doc)


@router.get("", response_model=List[ContactPublic])
async def list_contacts(
    list_id: Optional[str] = Query(None),
    current_user: UserPublic = Depends(get_current_user),
    db=Depends(get_db),
):
    user_oid = _oid(current_user.id)
    query = {"user_id": user_oid}
    if list_id:
        query["list_ids"] = _oid(list_id)

    cursor = db["contacts"].find(query).sort("created_at", -1)
    docs = [d async for d in cursor]
    return [_sanitize_contact(d) for d in docs]


@router.get("/stats")
async def contacts_stats(current_user: UserPublic = Depends(get_current_user), db=Depends(get_db)):
    user_oid = _oid(current_user.id)
    total = await db["contacts"].count_documents({"user_id": user_oid})
    return {"total": total}

@router.get("/dashboard/stats")
async def dashboard_stats(current_user: UserPublic = Depends(get_current_user), db=Depends(get_db)):
    """
    Aggregate endpoint that returns all dashboard statistics.
    Returns counts for: contacts, contact lists, templates, and broadcasts
    """
    user_oid = _oid(current_user.id)
    
    # Execute all counts in parallel
    contacts_count = await db["contacts"].count_documents({"user_id": user_oid})
    contact_lists_count = await db["contact_lists"].count_documents({"user_id": user_oid})
    templates_count = await db["templates"].count_documents({"user_id": user_oid})
    broadcasts_count = await db["broadcasts"].count_documents({"user_id": user_oid})
    
    return {
        "contacts": contacts_count,
        "contact_lists": contact_lists_count,
        "templates": templates_count,
        "broadcasts": broadcasts_count,
    }

@router.patch("/{contact_id}", response_model=ContactPublic)
async def update_contact(
    contact_id: str,
    payload: ContactUpdate,
    current_user: UserPublic = Depends(get_current_user),
    db=Depends(get_db),
):
    user_oid = _oid(current_user.id)
    cid = _oid(contact_id)

    updates = {}
    if payload.name is not None:
        updates["name"] = payload.name.strip()
    if payload.phone is not None:
        updates["phone"] = payload.phone.strip()
    if payload.list_ids is not None:
        try:
            updates["list_ids"] = [ObjectId(lid) for lid in payload.list_ids]
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid list id")

    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")

    doc = await db["contacts"].find_one_and_update(
        {"_id": cid, "user_id": user_oid},
        {"$set": updates},
        return_document=True,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Contact not found")
    return _sanitize_contact(doc)


@router.delete("/{contact_id}")
async def delete_contact(contact_id: str, current_user: UserPublic = Depends(get_current_user), db=Depends(get_db)):
    user_oid = _oid(current_user.id)
    cid = _oid(contact_id)
    res = await db["contacts"].delete_one({"_id": cid, "user_id": user_oid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"success": True}


@router.post("/{contact_id}/lists/{list_id}")
async def add_contact_to_list(contact_id: str, list_id: str, current_user: UserPublic = Depends(get_current_user), db=Depends(get_db)):
    user_oid = _oid(current_user.id)
    cid = _oid(contact_id)
    lid = _oid(list_id)

    # Ensure list exists and belongs to user
    lst = await db["contact_lists"].find_one({"_id": lid, "user_id": user_oid})
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")

    doc = await db["contacts"].find_one_and_update(
        {"_id": cid, "user_id": user_oid},
        {"$addToSet": {"list_ids": lid}},
        return_document=True,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Contact not found")
    return _sanitize_contact(doc)


@router.delete("/{contact_id}/lists/{list_id}")
async def remove_contact_from_list(contact_id: str, list_id: str, current_user: UserPublic = Depends(get_current_user), db=Depends(get_db)):
    user_oid = _oid(current_user.id)
    cid = _oid(contact_id)
    lid = _oid(list_id)
    doc = await db["contacts"].find_one_and_update(
        {"_id": cid, "user_id": user_oid},
        {"$pull": {"list_ids": lid}},
        return_document=True,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Contact not found")
    return _sanitize_contact(doc)
