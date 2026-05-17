# Alexa Forge

Alexa Forge is a creative AI operations layer: a unified control plane for routing, generating, managing, and shipping AI creative assets across multiple providers.

## Positioning

**The control plane for AI content generation.**

It combines:
- Multi-provider creative generation API
- API key vault with health checks and failover
- Smart provider/model/key routing
- Queue-based task execution
- Preset-driven generation workflows
- Asset history and campaign organization
- Analytics for cost, latency, failures, and throughput

## MVP Scope

MVP v1 ships:
- Auth-ready backend skeleton
- API Vault
- Provider adapter interface
- Smart Router v0
- Task queue model
- Motion Studio API contract
- Preset library v0
- Basic dashboard spec

## Runtime Stack

- Backend: FastAPI
- DB: PostgreSQL
- Queue: Redis + RQ
- Storage: S3-compatible bucket
- Frontend: Next.js + Tailwind + shadcn/ui
- Deployment: VPS backend + Vercel frontend
