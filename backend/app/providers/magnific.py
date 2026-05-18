"""Magnific AI provider adapter — image upscaling and enhancement."""

import json
import urllib.request
import urllib.error
from app.providers.base import CreativeProvider, ProviderResult


class MagnificProvider(CreativeProvider):
    """Magnific AI adapter for image upscaling/enhancement.

    BYOK: API key from vault. Supports dry_run.
    Docs: https://docs.magnific.ai/
    """

    name = "magnific"
    base_url = "https://api.magnific.ai/v1"

    async def submit(self, payload: dict, api_key: str) -> ProviderResult:
        request_payload = self._build_payload(payload)

        if payload.get("dry_run"):
            return ProviderResult(
                provider_task_id="magnific_dry_run",
                output_url="magnific-dry-run://upscale",
                metadata={"dry_run": True, "payload": request_payload},
            )

        url = f"{self.base_url}/upscale"
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
            with urllib.request.urlopen(req, timeout=180) as resp:
                data = json.loads(resp.read().decode())
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode(errors="replace")[:1000]
            raise RuntimeError(f"Magnific HTTP {exc.code}: {detail}") from exc

        task_id = data.get("id") or data.get("request_id") or "magnific_unknown"
        output_url = data.get("output_url") or data.get("result", {}).get("url") or f"magnific-queued://{task_id}"
        return ProviderResult(provider_task_id=task_id, output_url=output_url, metadata={"raw": data})

    def _build_payload(self, payload: dict) -> dict:
        built = {
            "image_url": payload.get("image_url", ""),
            "scale": payload.get("scale", 2),
            "style": payload.get("style", "auto"),
        }
        if payload.get("prompt"):
            built["prompt"] = payload["prompt"]
        if payload.get("creativity"):
            built["creativity"] = payload["creativity"]
        return built
