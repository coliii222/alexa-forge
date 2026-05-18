"""Campaign routes: group tasks into projects."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.auth import get_current_user
from app.database import create_campaign, list_campaigns

router = APIRouter()


class CampaignCreate(BaseModel):
    name: str
    description: str = ""


@router.post("")
def new_campaign(body: CampaignCreate, user: dict = Depends(get_current_user)):
    return create_campaign(user["id"], body.name, body.description)


@router.get("")
def get_campaigns(user: dict = Depends(get_current_user)):
    return list_campaigns(user["id"])
