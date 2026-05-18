import asyncio
from app.database import create_task, update_task, list_tasks as db_list_tasks, get_task as db_get_task, now, increment_key_success, increment_key_error
from app.router.policy import choose_provider_key
from app.activity import log_activity


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
        result = asyncio.run(provider.submit(payload, secret))
        task = update_task(task["id"], {
            "status": "completed",
            "provider_task_id": result.provider_task_id,
            "output_url": result.output_url,
            "metadata": result.metadata,
            "finished_at": now(),
        })
        increment_key_success(key_row["id"])
        log_activity(user_id, "motion_studio", "generate_video", "success", f"Task #{task['id']} completed")
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
