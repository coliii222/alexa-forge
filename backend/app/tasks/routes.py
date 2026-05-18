from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from app.auth import get_current_user
from app.tasks.service import create_video_task, list_tasks, get_task

router = APIRouter()


class VideoGenRequest(BaseModel):
    mode: str = "image_to_video"
    prompt: str = ""
    image_url: str = None
    provider: str = "fake"
    dry_run: bool = False
    campaign_id: int = None


@router.post("/generate/video")
def generate_video(body: VideoGenRequest, user: dict = Depends(get_current_user)):
    payload = body.model_dump()
    return create_video_task(user["id"], payload)


@router.get("/tasks")
def get_tasks(
    status: str = Query(None),
    user: dict = Depends(get_current_user),
):
    return list_tasks(user_id=user["id"], status=status)


@router.get("/tasks/{task_id}")
def get_task_detail(task_id: int, user: dict = Depends(get_current_user)):
    task = get_task(task_id, user_id=user["id"])
    if not task:
        from fastapi import HTTPException
        raise HTTPException(404, "Task not found")
    return task
