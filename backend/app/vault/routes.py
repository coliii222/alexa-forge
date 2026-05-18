from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.auth import get_current_user
from app.vault.service import create_key, list_keys_serialized, remove_key, set_key_active
from app.activity import log_activity

router = APIRouter()


class KeyCreate(BaseModel):
    provider: str
    label: str
    secret: str
    priority: int = 0


class KeyToggle(BaseModel):
    active: bool


@router.post("/keys")
def add_key(body: KeyCreate, user: dict = Depends(get_current_user)):
    key = create_key(user["id"], body.provider, body.label, body.secret, body.priority)
    log_activity(user["id"], "api_vault", "api_key_add", "success", f"Added {body.provider} key: {body.label}")
    return key


@router.get("/keys")
def get_keys(user: dict = Depends(get_current_user)):
    return list_keys_serialized(user["id"])


@router.delete("/keys/{key_id}")
def delete_key_route(key_id: int, user: dict = Depends(get_current_user)):
    if not remove_key(key_id, user["id"]):
        raise HTTPException(404, "Key not found")
    log_activity(user["id"], "api_vault", "api_key_delete", "info", f"Deleted key #{key_id}")
    return {"ok": True}


@router.patch("/keys/{key_id}/toggle")
def toggle_key_route(key_id: int, body: KeyToggle, user: dict = Depends(get_current_user)):
    if not set_key_active(key_id, user["id"], body.active):
        raise HTTPException(404, "Key not found")
    status = "enabled" if body.active else "disabled"
    log_activity(user["id"], "api_vault", f"api_key_{status}", "info", f"Key #{key_id} {status}")
    return {"ok": True, "active": body.active}
