"""Task polling: check status of queued/running tasks from providers."""

import json
import urllib.request
import urllib.error
from app.database import get_db, update_task, now
from app.activity import log_activity


# Provider-specific status check endpoints
POLL_CONFIGS = {
    "fal": {
        "url_template": "https://queue.fal.run/{model}/requests/{task_id}/status",
        "auth_header": "Authorization",
        "auth_prefix": "Key ",
    },
    "runway": {
        "url_template": "https://api.runwayml.com/v1/tasks/{task_id}",
        "auth_header": "Authorization",
        "auth_prefix": "Bearer ",
        "extra_headers": {"X-Runway-Version": "2024-11-06"},
    },
    "kling": {
        "url_template": "https://api.klingai.com/v1/videos/tasks/{task_id}",
        "auth_header": "Authorization",
        "auth_prefix": "Bearer ",
    },
}


def poll_task(task_id: int) -> dict | None:
    """Poll a single task's status from its provider. Returns updated task or None."""
    from app.vault.service import active_keys_for_provider, get_secret

    with get_db() as conn:
        row = conn.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
    if not row:
        return None

    task = dict(row)
    if task["status"] not in ("queued", "running"):
        return task

    provider = task["provider"]
    if provider not in POLL_CONFIGS:
        return task

    config = POLL_CONFIGS[provider]
    provider_task_id = task.get("provider_task_id")
    if not provider_task_id or provider_task_id.endswith("_dry_run"):
        return task

    # Get API key for this provider
    keys = active_keys_for_provider(provider, task["user_id"])
    if not keys:
        return task
    api_key = get_secret(keys[0])

    # Build poll URL — prefer response_url from metadata (fal returns full result there)
    metadata = task.get("metadata")
    if isinstance(metadata, str):
        try:
            metadata = json.loads(metadata)
        except (json.JSONDecodeError, TypeError):
            metadata = {}

    response_url = (metadata or {}).get("response_url") or (metadata or {}).get("raw", {}).get("response_url")
    model = (metadata or {}).get("model", "")

    if response_url and provider == "fal":
        # fal.ai: response_url returns full result when complete
        url = response_url
    else:
        url = config["url_template"].format(task_id=provider_task_id, model=model)
    headers = {
        config["auth_header"]: f"{config['auth_prefix']}{api_key}",
        "Content-Type": "application/json",
    }
    if config.get("extra_headers"):
        headers.update(config["extra_headers"])

    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
        return task

    # Parse status based on provider
    new_status, output_url = _parse_poll_response(provider, data)

    if new_status and new_status != task["status"]:
        updates = {"status": new_status}
        if output_url:
            updates["output_url"] = output_url
        if new_status in ("completed", "failed"):
            updates["finished_at"] = now()
        if new_status == "failed":
            updates["error"] = data.get("error") or data.get("failure_reason") or "Provider reported failure"

        task = update_task(task_id, updates)
        log_activity(task["user_id"], "motion_studio", f"poll_{new_status}", new_status, f"Task #{task_id} → {new_status}")

    return task


def poll_pending_tasks(limit: int = 20) -> list[dict]:
    """Poll all queued/running tasks. Called by cron or manual trigger.
    Prioritizes running tasks (already submitted) over old queued ones."""
    with get_db() as conn:
        rows = conn.execute(
            """SELECT id FROM tasks
               WHERE status IN ('running','queued')
               ORDER BY CASE WHEN status='running' THEN 0 ELSE 1 END, id
               LIMIT ?""",
            (limit,),
        ).fetchall()

    results = []
    for row in rows:
        result = poll_task(row[0])
        if result:
            results.append(result)
    return results


def _parse_poll_response(provider: str, data: dict) -> tuple[str | None, str | None]:
    """Parse provider poll response into (status, output_url)."""
    if provider == "fal":
        # Check if response contains actual output data (images/videos)
        # This happens when polling response_url and task is complete
        output_url = _extract_fal_output(data)
        if output_url:
            return "completed", output_url
        # Otherwise check status field
        status = data.get("status")
        if status in ("COMPLETED", "OK"):
            output_url = _extract_fal_output(data.get("response", data))
            return "completed", output_url
        elif status in ("FAILED", "CANCELLED"):
            return "failed", None
        elif status in ("IN_QUEUE", "IN_PROGRESS"):
            return "running", None
        # If no status and no output, task is still running
        return "running", None

    elif provider == "runway":
        status = data.get("status")
        if status == "SUCCEEDED":
            outputs = data.get("output", [])
            output_url = outputs[0] if outputs else None
            return "completed", output_url
        elif status == "FAILED":
            return "failed", None
        elif status in ("PENDING", "RUNNING"):
            return "running", None

    elif provider == "kling":
        task_data = data.get("data", data)
        status = task_data.get("task_status") or task_data.get("status")
        if status == "succeed":
            videos = task_data.get("task_result", {}).get("videos", [])
            output_url = videos[0].get("url") if videos and isinstance(videos[0], dict) else None
            return "completed", output_url
        elif status == "failed":
            return "failed", None
        elif status in ("submitted", "processing"):
            return "running", None

    return None, None


def _extract_fal_output(data: dict) -> str | None:
    """Extract output URL from fal.ai response. Handles images, videos, and generic outputs."""
    # Image generation (FLUX, SDXL, etc.)
    if isinstance(data.get("images"), list) and data["images"]:
        first = data["images"][0]
        if isinstance(first, dict) and first.get("url"):
            return first["url"]
        if isinstance(first, str) and first.startswith("http"):
            return first
    # Video generation (Kling, SVD, etc.)
    if isinstance(data.get("videos"), list) and data["videos"]:
        first = data["videos"][0]
        if isinstance(first, dict) and first.get("url"):
            return first["url"]
        if isinstance(first, str) and first.startswith("http"):
            return first
    # Generic keys
    for key in ("video", "output", "file", "image"):
        value = data.get(key)
        if isinstance(value, dict) and value.get("url"):
            return value["url"]
        if isinstance(value, str) and value.startswith("http"):
            return value
    return None
