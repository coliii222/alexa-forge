from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from app.tasks.service import create_video_task, get_task, list_tasks

router=APIRouter()
class VideoGenerate(BaseModel):
    mode: str = 'image_to_video'
    prompt: str
    image_url: str | None = None
    provider: str | None = 'fake'
    model: str | None = None
    duration: str | None = None
    aspect_ratio: str | None = None
    dry_run: bool = False

@router.post('/generate/video')
def generate_video(payload: VideoGenerate): return create_video_task(payload.model_dump())
@router.get('/tasks')
def tasks(): return list_tasks()
@router.get('/tasks/{task_id}')
def task(task_id:int):
    t=get_task(task_id)
    if not t: raise HTTPException(404,'Task not found')
    return t
