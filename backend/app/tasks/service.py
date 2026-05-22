import asyncio
from app.database import create_task, update_task, list_tasks as db_list_tasks, get_task as db_get_task, now, increment_key_success, increment_key_error
from app.router.policy import choose_provider_key
from app.activity import log_activity

PUBLIC_HOST = "15.135.225.16:8000"


def _to_data_uri(url: str | None) -> str | None:
    """Convert local file path to base64 data URI for APIs that require HTTPS (like fal.ai)."""
    if not url:
        return None
    import base64, mimetypes, os
    local_path = None
    if url.startswith("/uploads/"):
        local_path = os.path.join("/home/ubuntu/alexa-forge/backend", url.lstrip("/"))
    elif url.startswith(f"http://{PUBLIC_HOST}/uploads/"):
        local_path = os.path.join("/home/ubuntu/alexa-forge/backend", url.split(f"http://{PUBLIC_HOST}/")[1])
    if local_path and os.path.exists(local_path):
        mime = mimetypes.guess_type(local_path)[0] or "image/jpeg"
        with open(local_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode()
        return f"data:{mime};base64,{b64}"
    return url


def list_tasks(user_id: int = None, status: str = None):
    return db_list_tasks(user_id=user_id, status=status)


def get_task(task_id: int, user_id: int = None):
    return db_get_task(task_id, user_id)


def create_video_task(user_id: int, payload: dict) -> dict:
    task = create_task({
        "user_id": user_id,
        "type": "video",
        "mode": payload.get("mode", "image_to_video"),
        "provider": payload.get("provider") or "fake",
        "status": "queued",
        "prompt": payload.get("prompt", ""),
        "image_url": payload.get("image_url"),
        "campaign_id": payload.get("campaign_id"),
        "created_at": now(),
    })

    log_activity(user_id, "motion_studio", "generate_video", "info", f"Task #{task['id']} queued ({task['provider']})")

    try:
        provider, key_row, secret = choose_provider_key(task["provider"], user_id)
        update_task(task["id"], {"status": "running"})
        # Resolve local image paths to data URIs for external APIs
        if payload.get("image_url"):
            payload["image_url"] = _to_data_uri(payload["image_url"])
        result = asyncio.run(provider.submit(payload, secret))

        if task["provider"] == "fake":
            # Fake provider: complete immediately (no real async work)
            task = update_task(task["id"], {
                "status": "completed",
                "provider_task_id": result.provider_task_id,
                "output_url": result.output_url,
                "metadata": result.metadata,
                "finished_at": now(),
            })
        else:
            # Real providers: stay in "running", background poll will finalize
            task = update_task(task["id"], {
                "provider_task_id": result.provider_task_id,
                "output_url": result.output_url,
                "metadata": {
                    "model": result.metadata.get("model", ""),
                    "raw": result.metadata.get("raw", {}),
                    "response_url": result.metadata.get("raw", {}).get("response_url"),
                },
            })

        increment_key_success(key_row["id"])
        log_activity(user_id, "motion_studio", "generate_video", "info", f"Task #{task['id']} submitted to {task['provider']}")
    except Exception as exc:
        task = update_task(task["id"], {
            "status": "failed",
            "error": str(exc),
            "finished_at": now(),
        })
        if 'key_row' in dir():
            increment_key_error(key_row["id"])
        log_activity(user_id, "motion_studio", "generate_video", "failed", f"Task #{task['id']}: {str(exc)[:200]}")

    return task
