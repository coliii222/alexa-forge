from pydantic import BaseModel
from fastapi import APIRouter
from app.vault.service import create_key, list_keys

router=APIRouter()
class KeyCreate(BaseModel):
    provider: str
    label: str
    secret: str
    priority: int = 0

@router.get('/keys')
def keys(): return list_keys()
@router.post('/keys')
def add_key(payload: KeyCreate): return create_key(payload.provider, payload.label, payload.secret, payload.priority)
@router.get('/status')
def status():
    keys=list_keys(); return {"total":len(keys),"active":sum(1 for k in keys if k['is_active']),"limited":sum(1 for k in keys if k['is_limited']),"inactive":sum(1 for k in keys if not k['is_active'])}
