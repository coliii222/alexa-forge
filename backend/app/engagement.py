"""Engagement + A/B analytics for generated tasks."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.auth import get_current_user
from app.database import get_db, now

router = APIRouter()


class EventIn(BaseModel):
    event_type: str  # impression, view, download, selected, click
    meta: Optional[dict] = None


@router.post("/tasks/{task_id}/event")
def track_event(task_id: int, body: EventIn, user: dict = Depends(get_current_user)):
    """Track engagement event for A/B analytics."""
    allowed = {"impression", "view", "download", "selected", "click"}
    if body.event_type not in allowed:
        raise HTTPException(400, f"event_type must be one of: {', '.join(sorted(allowed))}")

    with get_db() as db:
        task = db.execute("SELECT id FROM tasks WHERE id = ? AND user_id = ?", (task_id, user["id"])).fetchone()
        if not task:
            raise HTTPException(404, "Task not found")
        db.execute(
            "INSERT INTO task_events (user_id, task_id, event_type, meta, created_at) VALUES (?, ?, ?, ?, ?)",
            (user["id"], task_id, body.event_type, str(body.meta or {}), now()),
        )
        db.commit()
    return {"ok": True, "task_id": task_id, "event_type": body.event_type}


@router.get("/ab")
def ab_analytics(campaign_id: Optional[int] = None, user: dict = Depends(get_current_user)):
    """Return A/B variant analytics grouped by task."""
    with get_db() as db:
        params = [user["id"]]
        where = "t.user_id = ?"
        if campaign_id:
            where += " AND t.campaign_id = ?"
            params.append(campaign_id)

        rows = db.execute(f"""
            SELECT
                t.id,
                t.mode,
                t.provider,
                t.status,
                t.prompt,
                t.output_url,
                t.campaign_id,
                t.created_at,
                COUNT(CASE WHEN e.event_type='impression' THEN 1 END) as impressions,
                COUNT(CASE WHEN e.event_type='view' THEN 1 END) as views,
                COUNT(CASE WHEN e.event_type='download' THEN 1 END) as downloads,
                COUNT(CASE WHEN e.event_type='selected' THEN 1 END) as selected,
                COUNT(CASE WHEN e.event_type='click' THEN 1 END) as clicks
            FROM tasks t
            LEFT JOIN task_events e ON e.task_id = t.id AND e.user_id = t.user_id
            WHERE {where}
            GROUP BY t.id
            ORDER BY t.id DESC
            LIMIT 100
        """, params).fetchall()

        items = []
        for r in rows:
            d = dict(r)
            d["score"] = (d["selected"] * 5) + (d["downloads"] * 3) + (d["clicks"] * 2) + d["views"]
            d["ctr"] = round((d["clicks"] / d["impressions"] * 100), 2) if d["impressions"] else 0
            items.append(d)
        return {"items": items, "winner": max(items, key=lambda x: x["score"]) if items else None}
