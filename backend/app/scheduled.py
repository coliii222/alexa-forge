"""Scheduled posting foundation: content calendar and safe connector dry-runs."""

import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.auth import get_current_user
from app.database import get_db, now

router = APIRouter()
SUPPORTED_PLATFORMS = {"tiktok", "instagram", "youtube_shorts"}


class ScheduleIn(BaseModel):
    task_id: int
    platform: str
    scheduled_at: str
    caption: Optional[str] = None


class ConnectorIn(BaseModel):
    platform: str
    status: str = "draft"  # draft, ready, disabled
    mode: str = "dry_run"  # dry_run now; live later after explicit confirmation
    config: dict = {}


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
    if body.platform not in SUPPORTED_PLATFORMS:
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


@router.get("/connectors")
def list_connectors(user: dict = Depends(get_current_user)):
    with get_db() as db:
        existing = {
            row["platform"]: _serialize_connector(dict(row))
            for row in db.execute("SELECT * FROM social_connectors WHERE user_id=?", (user["id"],)).fetchall()
        }
    return [
        existing.get(platform) or {
            "platform": platform,
            "status": "draft",
            "mode": "dry_run",
            "config": {},
            "configured": False,
        }
        for platform in sorted(SUPPORTED_PLATFORMS)
    ]


@router.put("/connectors/{platform}")
def upsert_connector(platform: str, body: ConnectorIn, user: dict = Depends(get_current_user)):
    if platform not in SUPPORTED_PLATFORMS or body.platform != platform:
        raise HTTPException(400, "Unsupported platform")
    if body.status not in {"draft", "ready", "disabled"}:
        raise HTTPException(400, "Unsupported connector status")
    if body.mode != "dry_run":
        raise HTTPException(400, "Live posting is not enabled yet")

    config_json = json.dumps(body.config or {})
    timestamp = now()
    with get_db() as db:
        db.execute(
            """INSERT INTO social_connectors (user_id, platform, status, mode, config, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(user_id, platform) DO UPDATE SET
                 status=excluded.status,
                 mode=excluded.mode,
                 config=excluded.config,
                 updated_at=excluded.updated_at""",
            (user["id"], platform, body.status, body.mode, config_json, timestamp, timestamp),
        )
        row = db.execute(
            "SELECT * FROM social_connectors WHERE user_id=? AND platform=?",
            (user["id"], platform),
        ).fetchone()
        return _serialize_connector(dict(row))


@router.get("/{post_id}/preview")
def preview_post(post_id: int, user: dict = Depends(get_current_user)):
    post = _get_post(post_id, user["id"])
    return {"ok": True, "dry_run": True, "payload": _build_payload(post)}


@router.post("/{post_id}/post-now")
def post_now(post_id: int, dry_run: bool = Query(True), user: dict = Depends(get_current_user)):
    post = _get_post(post_id, user["id"])
    return _publish_or_preview(post, dry_run=dry_run)


@router.post("/process-due")
def process_due(dry_run: bool = Query(True), user: dict = Depends(get_current_user)):
    current = now()
    with get_db() as db:
        rows = db.execute(
            """SELECT s.*, t.output_url, t.mode, t.provider
               FROM scheduled_posts s
               LEFT JOIN tasks t ON t.id=s.task_id
               WHERE s.user_id=? AND s.status='scheduled' AND s.scheduled_at <= ?
               ORDER BY s.scheduled_at ASC LIMIT 20""",
            (user["id"], current),
        ).fetchall()
    posts = [dict(row) for row in rows]
    return {
        "ok": True,
        "dry_run": dry_run,
        "processed": [_publish_or_preview(post, dry_run=dry_run) for post in posts],
    }


def _get_post(post_id: int, user_id: int) -> dict:
    with get_db() as db:
        row = db.execute(
            """SELECT s.*, t.output_url, t.mode, t.provider
               FROM scheduled_posts s
               LEFT JOIN tasks t ON t.id=s.task_id
               WHERE s.id=? AND s.user_id=?""",
            (post_id, user_id),
        ).fetchone()
    if not row:
        raise HTTPException(404, "Scheduled post not found")
    return dict(row)


def _publish_or_preview(post: dict, dry_run: bool = True) -> dict:
    payload = _build_payload(post)
    if dry_run:
        return {
            "ok": True,
            "post_id": post["id"],
            "platform": post["platform"],
            "status": "dry_run_ready",
            "payload": payload,
        }
    raise HTTPException(400, "Public posting is not enabled yet. Run dry_run first, configure platform API, then confirm live posting explicitly.")


def _build_payload(post: dict) -> dict:
    if not post.get("output_url"):
        raise HTTPException(400, "Task has no output_url to publish")
    return {
        "platform": post["platform"],
        "asset_url": post["output_url"],
        "caption": post.get("caption") or "",
        "scheduled_at": post["scheduled_at"],
        "source_task_id": post["task_id"],
        "provider": post.get("provider"),
        "mode": post.get("mode"),
    }


def _serialize_connector(row: dict) -> dict:
    config = json.loads(row.get("config") or "{}")
    return {
        "id": row["id"],
        "platform": row["platform"],
        "status": row["status"],
        "mode": row["mode"],
        "config": config,
        "configured": row["status"] == "ready",
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }
