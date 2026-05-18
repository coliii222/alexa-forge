"""Favorites: bookmark tasks/results."""

from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_user
from app.database import get_db, now

router = APIRouter()


@router.get("")
def list_favorites(user: dict = Depends(get_current_user)):
    """List user's favorited items."""
    with get_db() as db:
        rows = db.execute(
            "SELECT f.*, t.mode, t.provider, t.status, t.prompt, t.output_url, t.created_at FROM favorites f "
            "LEFT JOIN tasks t ON f.task_id = t.id WHERE f.user_id = ? ORDER BY f.created_at DESC",
            (user["id"],)
        ).fetchall()
        return [dict(r) for r in rows]


@router.post("")
def add_favorite(task_id: int, user: dict = Depends(get_current_user)):
    """Favorite a task."""
    with get_db() as db:
        existing = db.execute("SELECT * FROM favorites WHERE user_id = ? AND task_id = ?", (user["id"], task_id)).fetchone()
        if existing:
            return {"ok": True, "message": "Already favorited", "id": existing["id"]}
        db.execute("INSERT INTO favorites (user_id, task_id, created_at) VALUES (?, ?, ?)", (user["id"], task_id, now()))
        db.commit()
        row = db.execute("SELECT * FROM favorites WHERE user_id = ? AND task_id = ?", (user["id"], task_id)).fetchone()
        return {"ok": True, "id": row["id"]}


@router.delete("/{task_id}")
def remove_favorite(task_id: int, user: dict = Depends(get_current_user)):
    """Unfavorite a task."""
    with get_db() as db:
        db.execute("DELETE FROM favorites WHERE user_id = ? AND task_id = ?", (user["id"], task_id))
        db.commit()
        return {"ok": True, "deleted": task_id}