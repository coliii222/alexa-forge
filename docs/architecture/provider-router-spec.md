# Provider Router Specification

## Provider Interface

All providers implement this contract:

```python
class CreativeProvider:
    provider_name: str

    async def validate_key(self, api_key: str) -> ProviderHealth: ...
    async def submit(self, task: GenerationTask, api_key: str) -> SubmitResult: ...
    async def poll(self, provider_task_id: str, api_key: str) -> PollResult: ...
    async def cancel(self, provider_task_id: str, api_key: str) -> CancelResult: ...
```

## Normalized Errors

Provider-specific errors are normalized into:

```text
auth_failed
quota_limited
rate_limited
timeout
bad_request
content_rejected
provider_down
unknown_error
```

## Routing Score

```text
score =
  provider_health * 0.30 +
  key_success_rate * 0.25 +
  latency_score * 0.15 +
  cost_score * 0.15 +
  policy_match * 0.15
```

## Failover Policy v0

1. Try selected provider + highest scoring active key.
2. If key returns quota/rate limit, mark key cooldown and retry same provider with next key.
3. If provider fails twice, fallback to next provider compatible with task mode.
4. If all providers fail, mark task failed with full error chain.

## Initial Providers

MVP providers:
- fal.ai
- Replicate

Next providers:
- Veo
- Kling
- Seedance
- Magnific

## Task Modes

```text
text_to_image
image_to_image
image_to_video
text_to_video
upscale
background_remove
caption_generate
```
