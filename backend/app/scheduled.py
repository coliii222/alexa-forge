"""Scheduled posting foundation: content calendar with connector placeholders."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.auth import get_current_user
from app.database import get_db, now

router = APIRouter()


class ScheduleIn(BaseModel):
    task_id: int
    platform: str  # tiktok, instagram, youtube_shorts
    scheduled_at: str
    caption: Optional[str] = None


@router.get("")
def list_scheduled(user: dict = Depends(get_current_user)):
    with get_db() as db:
        rows = db.execute(
            "SELECT s.*, t.output_url, t.mode, t.provider FROM scheduled_posts s LEFT JOIN tasks t ON t.id=s.task_id WHERE s.user_id=? ORDER BY s.scheduled_at ASC",
            (user["id"],),
        ).fetchall()
        return [dict(r) for r in rows]


@router.post("")
def create_scheduled(body: ScheduleIn, user: dict = Depends(get_current_user)):
    if body.platform not in {"tiktok", "instagram", "youtube_shorts"}:
        raise HTTPException(400, "Unsupported platform")
    with get_db() as db:
        task = db.execute("SELECT id FROM tasks WHERE id=? AND user_id=?", (body.task_id, user["id"])).fetchone()
        if not task:
            raise HTTPException(404, "Task not found")
        cur = db.execute(
            "INSERT INTO scheduled_posts (user_id, task_id, platform, scheduled_at, caption, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (user["id"], body.task_id, body.platform, body.scheduled_at, body.caption, "scheduled", now()),
        )
        db.commit()
        row = db.execute("SELECT * FROM scheduled_posts WHERE id=?", (cur.lastrowid,)).fetchone()
        return dict(row)


@router.delete("/{post_id}")
def delete_scheduled(post_id: int, user: dict = Depends(get_current_user)):
    with get_db() as db:
        cur = db.execute("DELETE FROM scheduled_posts WHERE id=? AND user_id=?", (post_id, user["id"]))
        db.commit()
        return {"ok": True, "deleted": cur.rowcount}
