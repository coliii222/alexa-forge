import json
import urllib.request
import urllib.error
from app.providers.base import CreativeProvider, ProviderResult


class FalProvider(CreativeProvider):
    """Minimal fal.ai queue API adapter.

    This adapter is BYOK: the API key comes from API Vault.
    It supports dry_run=True for local end-to-end testing without spending credits.
    """

    name = "fal"
    default_model = "fal-ai/flux/schnell"

    async def submit(self, payload: dict, api_key: str) -> ProviderResult:
        model = payload.get("model") or self._select_model(payload)
        request_payload = self._build_payload(payload)

        if payload.get("dry_run"):
            return ProviderResult(
                provider_task_id="fal_dry_run",
                output_url=f"fal-dry-run://{model}",
                metadata={"dry_run": True, "model": model, "payload": request_payload},
            )

        url = f"https://queue.fal.run/{model}"
        req = urllib.request.Request(
            url,
            data=json.dumps(request_payload).encode(),
            headers={
                "Authorization": f"Key {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode())
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode(errors="replace")[:1000]
            raise RuntimeError(f"fal.ai HTTP {exc.code}: {detail}") from exc

        request_id = data.get("request_id") or data.get("id") or "fal_unknown"
        output_url = self._extract_output_url(data) or data.get("response_url") or f"fal-queued://{request_id}"
        return ProviderResult(provider_task_id=request_id, output_url=output_url, metadata={"model": model, "raw": data})

    def _select_model(self, payload: dict) -> str:
        """Auto-select fal.ai model based on mode and inputs."""
        mode = payload.get("mode", "")
        has_image = bool(payload.get("image_url"))
        
        # Video generation modes (need image-to-video)
        video_modes = {"motion_transfer", "product_promo", "dance_viral", 
                       "template_scene", "audio_sync", "style_transfer"}
        
        if mode in video_modes and has_image:
            return "fal-ai/kling-video/v1.6/standard/image-to-video"
        elif mode in video_modes and not has_image:
            # Text-to-video (less common, use minimax)
            return "fal-ai/minimax-video/video-01-live"
        elif mode == "text_to_video":
            return "fal-ai/minimax-video/video-01-live"
        elif mode == "image_to_video" and has_image:
            return "fal-ai/kling-video/v1.6/standard/image-to-video"
        else:
            # Default: image generation
            return self.default_model

    def _build_payload(self, payload: dict) -> dict:
        built = {
            "prompt": payload.get("prompt", ""),
        }
        image_url = payload.get("image_url")
        if image_url:
            built["image_url"] = image_url
        if payload.get("duration"):
            built["duration"] = payload["duration"]
        if payload.get("aspect_ratio"):
            built["aspect_ratio"] = payload["aspect_ratio"]
        if payload.get("image_size"):
            built["image_size"] = payload["image_size"]
        if payload.get("num_images"):
            built["num_images"] = payload["num_images"]
        if payload.get("num_inference_steps"):
            built["num_inference_steps"] = payload["num_inference_steps"]
        return built

    def _extract_output_url(self, data: dict) -> str | None:
        for key in ("video", "output", "file"):
            value = data.get(key)
            if isinstance(value, dict) and value.get("url"):
                return value["url"]
            if isinstance(value, str) and value.startswith("http"):
                return value
        if isinstance(data.get("videos"), list) and data["videos"]:
            first = data["videos"][0]
            if isinstance(first, dict):
                return first.get("url")
            if isinstance(first, str):
                return first
        return None
