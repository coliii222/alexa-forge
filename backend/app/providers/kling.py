"""Kling AI provider adapter — video generation."""

import json
import urllib.request
import urllib.error
from app.providers.base import CreativeProvider, ProviderResult


class KlingProvider(CreativeProvider):
    """Kling AI adapter for video generation (image-to-video, text-to-video).

    BYOK: API key from vault. Supports dry_run.
    Docs: https://docs.klingai.com/
    """

    name = "kling"
    base_url = "https://api.klingai.com/v1"

    async def submit(self, payload: dict, api_key: str) -> ProviderResult:
        mode = payload.get("mode", "image_to_video")
        request_payload = self._build_payload(payload, mode)

        if payload.get("dry_run"):
            return ProviderResult(
                provider_task_id="kling_dry_run",
                output_url=f"kling-dry-run://{mode}",
                metadata={"dry_run": True, "mode": mode, "payload": request_payload},
            )

        endpoint = "images/generations" if mode == "text_to_image" else "videos/image2video"
        if mode == "text_to_video":
            endpoint = "videos/text2video"

        url = f"{self.base_url}/{endpoint}"
        req = urllib.request.Request(
            url,
            data=json.dumps(request_payload).encode(),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode())
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode(errors="replace")[:1000]
            raise RuntimeError(f"Kling HTTP {exc.code}: {detail}") from exc

        task_id = data.get("data", {}).get("task_id") or data.get("task_id") or data.get("id") or "kling_unknown"
        status = data.get("data", {}).get("task_status") or data.get("status") or "queued"
        output_url = self._extract_output(data) or f"kling-queued://{task_id}"

        return ProviderResult(
            provider_task_id=task_id,
            output_url=output_url,
            metadata={"status": status, "mode": mode, "raw": data},
        )

    def _build_payload(self, payload: dict, mode: str) -> dict:
        built = {
            "model_name": payload.get("model", "kling-v1"),
            "mode": payload.get("quality", "std"),
            "duration": payload.get("duration", "5"),
        }
        if payload.get("prompt"):
            built["prompt"] = payload["prompt"]
        if payload.get("negative_prompt"):
            built["negative_prompt"] = payload["negative_prompt"]
        if mode == "image_to_video" and payload.get("image_url"):
            built["image"] = payload["image_url"]
        if payload.get("aspect_ratio"):
            built["aspect_ratio"] = payload["aspect_ratio"]
        if payload.get("cfg_scale"):
            built["cfg_scale"] = payload["cfg_scale"]
        return built

    def _extract_output(self, data: dict) -> str | None:
        works = data.get("data", {}).get("task_result", {}).get("videos", [])
        if works and isinstance(works[0], dict):
            return works[0].get("url")
        return None
