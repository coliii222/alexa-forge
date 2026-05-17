# Alexa Forge Architecture

## Product Thesis

Most AI generation tools stop at `generate`. Alexa Forge is the control plane behind generation: it routes requests, rotates keys, fails over providers, manages queues, runs batch jobs, stores assets, and prepares outputs for publishing.

## Primary Users

1. AI content operators generating assets at volume.
2. Seller/affiliate operators turning products into content packages.
3. Agencies managing multiple client workspaces.
4. Bot/tool owners needing a creative generation backend.

## Core Flow

```text
Client request
  -> Unified API Gateway
  -> Policy Router
  -> API Vault key selection
  -> Queue task
  -> Provider worker
  -> Asset storage
  -> Status/history/analytics
  -> Optional publish/export
```

## Layers

### 1. Unified API Gateway

Public contracts:

```http
POST /v1/generate/image
POST /v1/generate/video
POST /v1/generate/audio
POST /v1/upscale
POST /v1/animate
POST /v1/tasks
GET  /v1/tasks/{task_id}
```

Requests describe intent, not provider details:

```json
{
  "mode": "image_to_video",
  "goal": "tiktok_dance",
  "quality": "high",
  "speed": "fast",
  "budget": "balanced",
  "input_asset_id": "asset_123",
  "prompt": "Animate this portrait into a confident dance reel."
}
```

### 2. Smart Router

Responsibilities:
- Select provider.
- Select model.
- Select key.
- Apply fallback policy.
- Apply cooldown/quarantine rules.

Policy examples:

```text
speed=fast      -> prefer Seedance/Kling fast class
quality=high    -> prefer Veo/Kling high-quality class
budget=low      -> prefer cheapest healthy provider
provider error  -> retry same provider with another key, then fallback provider
key limit       -> mark limited, cooldown, select next healthy key
```

### 3. API Vault++

Stores encrypted provider keys and health metadata.

Key states:
- active
- disabled
- limited
- cooldown
- burned
- auth_failed

Key health signals:
- last_error
- average latency
- success rate
- failover count
- quota estimate
- cooldown_until

### 4. Queue Engine

All generation tasks go through queue workers.

Queues:
- free
- premium
- batch
- admin
- retry

Workers:
- router-worker
- provider-worker
- asset-worker
- analytics-worker
- publish-worker

### 5. Asset Graph

Project hierarchy:

```text
Workspace
  -> Project
    -> Campaign
      -> Task
        -> Source Asset
        -> Generated Asset
        -> Caption
        -> Publish Package
        -> Cost Log
```

### 6. Preset Engine

Preset contains:
- prompt template
- negative prompt
- provider preferences
- duration
- aspect ratio
- camera motion
- caption template
- routing hints

Initial presets:
- TikTok Girl Dance
- Product Cinematic Reel
- Talking Photo
- Affiliate Hook Reel
- Luxury Product Ad

### 7. Batch Variant Generator

Examples:

```text
1 image x 5 prompt variants x 2 providers = 10 tasks
1 product x 10 ad angles = 10 publish-ready drafts
```

### 8. Publish Layer

MVP integrations:
- Download ZIP
- Telegram delivery
- Google Drive export

Future:
- TikTok draft helper
- YouTube Shorts package
- Instagram Reels package

### 9. Analytics Layer

Metrics:
- provider success rate
- key success rate
- latency p50/p95
- cost per task
- cost per project
- retry rate
- failover rate
- queue wait time

## Deployment Topology

```text
Vercel Frontend
  -> HTTPS API Backend (FastAPI)
    -> PostgreSQL
    -> Redis
    -> RQ workers
    -> S3 storage
    -> Provider APIs
```

## MVP Non-Goals

- No public marketplace.
- No complex team billing.
- No direct TikTok posting in v1.
- No custom model training.
