# Alexa Forge

The control plane for AI content generation.

## Quick Start (Local Dev)

```bash
cd /home/ubuntu/alexa-forge
./run.sh
```

Opens at `http://localhost:3000`

## Production Setup

### Backend (VPS)

Backend runs as a systemd service on this VPS:

```bash
sudo systemctl start alexa-forge-backend
sudo systemctl status alexa-forge-backend
```

API: `http://15.135.225.16:8000`
Health: `http://15.135.225.16:8000/health`

### Frontend (Vercel)

1. Push repo to GitHub
2. Import in Vercel → select `frontend/` as root directory
3. Set environment variable:
   - `NEXT_PUBLIC_API_URL` = `http://15.135.225.16:8000`
4. Deploy

Or use custom domain in Vercel dashboard after deploy.

### Environment Variables

**Backend** (`backend/.env`):
| Variable | Description |
|----------|-------------|
| `VAULT_SECRET` | Encryption key for API vault secrets |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `PUBLIC_HOST` | Public IP/domain of this VPS |

**Frontend** (Vercel env):
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |

## Architecture

```
[Vercel Frontend]  →  [VPS Backend :8000]  →  [fal.ai / providers]
     Next.js              FastAPI + SQLite        BYOK via Vault
```

- **API Vault**: encrypted key storage with priority routing
- **Smart Router**: provider/key selection with failover
- **Motion Studio**: image-to-video generation pipeline
- **Task Queue**: persistent task tracking (SQLite)
- **Presets**: reusable prompt templates

## Stack

- Backend: FastAPI, SQLite (WAL), Pydantic, cryptography
- Frontend: Next.js 15, React 19, TypeScript
- Deploy: systemd (backend), Vercel (frontend)

## API Endpoints

- `GET /health` — service health
- `GET /v1/vault/keys` — list vault keys (masked)
- `POST /v1/vault/keys` — add provider key
- `GET /v1/presets` — list generation presets
- `POST /v1/generate/video` — submit generation task
- `GET /v1/tasks` — list tasks
- `GET /v1/tasks/{id}` — get task detail
- `POST /v1/uploads/image` — upload image file
