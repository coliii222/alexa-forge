from fastapi import APIRouter
from pydantic import BaseModel
from app.vault.service import create_key, list_keys_serialized

router = APIRouter()


class KeyCreate(BaseModel):
    provider: str
    label: str
    secret: str
    priority: int = 0


@router.post("/keys")
def add_key(body: KeyCreate):
    return create_key(body.provider, body.label, body.secret, body.priority)


@router.get("/keys")
def get_keys():
    return list_keys_serialized()
