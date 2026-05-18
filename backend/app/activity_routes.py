"""Activity log routes."""

from fastapi import APIRouter, Depends, Query
from app.auth import get_current_user
from app.activity import get_activities, get_activity_summary

router = APIRouter()


@router.get("/")
def list_activity(
    module: str = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    user: dict = Depends(get_current_user),
):
    return get_activities(user_id=user["id"], module=module, limit=limit, offset=offset)


@router.get("/summary")
def activity_summary(user: dict = Depends(get_current_user)):
    return get_activity_summary(user_id=user["id"])
