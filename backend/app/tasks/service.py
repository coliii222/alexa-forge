import asyncio
from app.database import create_task, update_task, list_tasks as db_list_tasks, get_task as db_get_task, now, increment_key_success, increment_key_error
from app.router.policy import choose_provider_key


def list_tasks():
    return db_list_tasks()


def get_task(task_id: int):
    return db_get_task(task_id)


def create_video_task(payload: dict) -> dict:
    task = create_task({
        "type": "video",
        "mode": payload.get("mode", "image_to_video"),
        "provider": payload.get("provider") or "fake",
        "status": "queued",
        "prompt": payload.get("prompt", ""),
        "image_url": payload.get("image_url"),
        "created_at": now(),
    })

    try:
        provider, key_row, secret = choose_provider_key(task["provider"])
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
    except Exception as exc:
        task = update_task(task["id"], {
            "status": "failed",
            "error": str(exc),
            "finished_at": now(),
        })
        if 'key_row' in dir():
            increment_key_error(key_row["id"])

    return task
