import json
import urllib.request
import urllib.error
from app.providers.base import CreativeProvider, ProviderResult

# Available models grouped by category
MODELS = {
    "image": [
        {"id": "fal-ai/flux/schnell", "name": "FLUX Schnell", "desc": "Fast, cheap (~$0.003/image)", "speed": "fast", "quality": "good"},
        {"id": "fal-ai/flux/dev", "name": "FLUX Dev", "desc": "Better quality, slower (~$0.025/image)", "speed": "medium", "quality": "great"},
        {"id": "fal-ai/flux-pro/v1.1", "name": "FLUX Pro 1.1", "desc": "Highest quality (~$0.05/image)", "speed": "slow", "quality": "best"},
        {"id": "fal-ai/flux-realism", "name": "FLUX Realism", "desc": "Photorealistic people, best hands (~$0.03/image)", "speed": "medium", "quality": "best"},
        {"id": "fal-ai/recraft-v3", "name": "Recraft V3", "desc": "Great for logos, text, design", "speed": "medium", "quality": "great"},
    ],
    "video": [
        {"id": "fal-ai/kling-video/v1.6/standard/image-to-video", "name": "Kling 2.6 Standard", "desc": "Good quality, 5-10s", "speed": "medium", "quality": "good"},
        {"id": "fal-ai/kling-video/v1.6/pro/image-to-video", "name": "Kling 2.6 Pro", "desc": "Higher quality, 5-10s", "speed": "slow", "quality": "great"},
        {"id": "fal-ai/kling-video/v2.0/standard/image-to-video", "name": "Kling 3.0 Standard", "desc": "Latest model, better motion", "speed": "medium", "quality": "great"},
        {"id": "fal-ai/kling-video/v2.0/pro/image-to-video", "name": "Kling 3.0 Pro", "desc": "Best quality, 5-10s", "speed": "slow", "quality": "best"},
        {"id": "fal-ai/minimax-video/video-01", "name": "MiniMax Video", "desc": "Fast, good quality", "speed": "medium", "quality": "good"},
        {"id": "fal-ai/minimax-video/video-01-live", "name": "MiniMax Live", "desc": "Realistic motion, 6s", "speed": "medium", "quality": "great"},
        {"id": "fal-ai/veo2", "name": "Veo 2 (Google)", "desc": "Google DeepMind, 5-8s", "speed": "slow", "quality": "great"},
        {"id": "fal-ai/stable-video", "name": "Stable Video", "desc": "Open source, 4s", "speed": "fast", "quality": "good"},
        {"id": "fal-ai/kling-video/v1.6/standard/text-to-video", "name": "Kling Text-to-Video", "desc": "No image needed, 5s", "speed": "medium", "quality": "good"},
    ],
}


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
        
        video_modes = {"motion_transfer", "product_promo", "dance_viral", 
                       "template_scene", "audio_sync", "style_transfer"}
        
        if mode in video_modes and has_image:
            return "fal-ai/kling-video/v2.0/standard/image-to-video"
        elif mode in video_modes and not has_image:
            return "fal-ai/kling-video/v1.6/standard/text-to-video"
        elif mode == "text_to_video":
            return "fal-ai/kling-video/v1.6/standard/text-to-video"
        elif mode == "image_to_video" and has_image:
            return "fal-ai/kling-video/v2.0/standard/image-to-video"
        else:
            return self.default_model

    def _build_payload(self, payload: dict) -> dict:
        model = payload.get("model") or self._select_model(payload)
        built = {"prompt": payload.get("prompt", "")}

        # Detect model type
        is_video = "video" in model or "kling" in model or "minimax" in model or "svd" in model or "veo" in model

        if is_video:
            # Video models: only prompt + image_url + duration
            image_url = payload.get("image_url")
            if image_url:
                built["image_url"] = image_url
            if payload.get("duration"):
                built["duration"] = str(payload["duration"])
            else:
                built["duration"] = "5"
            neg = payload.get("negative_prompt")
            if neg:
                built["negative_prompt"] = neg
        else:
            # Image models: full parameter set
            if payload.get("image_url"):
                built["image_url"] = payload["image_url"]
            if payload.get("aspect_ratio"):
                built["aspect_ratio"] = payload["aspect_ratio"]
            if payload.get("image_size"):
                built["image_size"] = payload["image_size"]
            if payload.get("num_images"):
                built["num_images"] = payload["num_images"]
            if payload.get("num_inference_steps"):
                built["num_inference_steps"] = payload["num_inference_steps"]
            if payload.get("guidance_scale"):
                built["guidance_scale"] = payload["guidance_scale"]
            if payload.get("seed"):
                built["seed"] = payload["seed"]
            if payload.get("width"):
                built["width"] = payload["width"]
            if payload.get("height"):
                built["height"] = payload["height"]
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
        if isinstance(data.get("images"), list) and data["images"]:
            first = data["images"][0]
            if isinstance(first, dict) and first.get("url"):
                return first["url"]
        return None
