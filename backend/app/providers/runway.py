"""Runway Gen-3 provider adapter — video generation."""

import json
import urllib.request
import urllib.error
from app.providers.base import CreativeProvider, ProviderResult


class RunwayProvider(CreativeProvider):
    """Runway ML Gen-3 Alpha adapter for video generation.

    BYOK: API key from vault. Supports dry_run.
    Docs: https://docs.runwayml.com/
    """

    name = "runway"
    base_url = "https://api.runwayml.com/v1"

    async def submit(self, payload: dict, api_key: str) -> ProviderResult:
        request_payload = self._build_payload(payload)

        if payload.get("dry_run"):
            return ProviderResult(
                provider_task_id="runway_dry_run",
                output_url="runway-dry-run://gen3",
                metadata={"dry_run": True, "payload": request_payload},
            )

        url = f"{self.base_url}/image_to_video"
        req = urllib.request.Request(
            url,
            data=json.dumps(request_payload).encode(),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "X-Runway-Version": "2024-11-06",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode())
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode(errors="replace")[:1000]
            raise RuntimeError(f"Runway HTTP {exc.code}: {detail}") from exc

        task_id = data.get("id") or data.get("task_id") or "runway_unknown"
        output_url = data.get("output", [None])[0] if isinstance(data.get("output"), list) else data.get("output_url") or f"runway-queued://{task_id}"
        status = data.get("status", "queued")

        return ProviderResult(
            provider_task_id=task_id,
            output_url=output_url or f"runway-queued://{task_id}",
            metadata={"status": status, "raw": data},
        )

    def _build_payload(self, payload: dict) -> dict:
        built = {
            "promptImage": payload.get("image_url", ""),
            "model": payload.get("model", "gen3a_turbo"),
        }
        if payload.get("prompt"):
            built["promptText"] = payload["prompt"]
        if payload.get("duration"):
            built["duration"] = payload["duration"]
        if payload.get("ratio"):
            built["ratio"] = payload["ratio"]
        if payload.get("watermark"):
            built["watermark"] = payload["watermark"]
        return built
