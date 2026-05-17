from fastapi import APIRouter
from app.presets.defaults import DEFAULT_PRESETS
router=APIRouter()
@router.get('')
def presets(): return DEFAULT_PRESETS
