# Alexa Forge MVP Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a working MVP of Alexa Forge: API Vault, provider router, task queue, presets, and a basic Motion Studio flow.

**Architecture:** FastAPI backend with PostgreSQL persistence and Redis/RQ queue workers. Next.js frontend talks to the backend through a unified `/v1` API. Provider adapters hide provider-specific APIs behind one normalized interface.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, PostgreSQL, Redis, RQ, Next.js, Tailwind, shadcn/ui.

---

## Phase 1 — Backend Skeleton

### Task 1: Create backend package structure

**Objective:** Create the FastAPI app with module boundaries.

**Files:**
- Create: `backend/app/main.py`
- Create: `backend/app/config.py`
- Create: `backend/app/database.py`
- Create: `backend/app/providers/base.py`
- Create: `backend/app/router/policy.py`
- Create: `backend/app/vault/service.py`
- Create: `backend/app/tasks/service.py`

**Verify:**

```bash
cd /home/ubuntu/alexa-forge
python -m py_compile backend/app/**/*.py
```

Expected: no syntax errors.

### Task 2: Add project dependencies

**Objective:** Add backend dependencies and a local dev bootstrap.

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`

**Verify:**

```bash
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
```

Expected: install completes.

## Phase 2 — Data Models

### Task 3: Add SQLAlchemy models

**Objective:** Implement models for workspaces, api_keys, presets, tasks, assets, key_events.

**Files:**
- Create: `backend/app/models.py`

**Verify:**

```bash
backend/.venv/bin/python -m py_compile backend/app/models.py
```

Expected: pass.

### Task 4: Add migration bootstrap

**Objective:** Configure Alembic migrations.

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/versions/0001_initial.py`

**Verify:**

```bash
cd backend
DATABASE_URL=sqlite:///./dev.db .venv/bin/alembic upgrade head
```

Expected: dev.db created.

## Phase 3 — API Vault

### Task 5: Implement encrypted key storage

**Objective:** Store provider keys encrypted at rest.

**Files:**
- Create: `backend/app/vault/crypto.py`
- Modify: `backend/app/vault/service.py`

**Verify:**

```bash
backend/.venv/bin/python - <<'PY'
from app.vault.crypto import encrypt_secret, decrypt_secret
x = encrypt_secret('test-key')
assert decrypt_secret(x) == 'test-key'
print('ok')
PY
```

Expected: `ok`.

### Task 6: Add vault API routes

**Objective:** Add CRUD endpoints for provider keys.

**Files:**
- Create: `backend/app/vault/routes.py`
- Modify: `backend/app/main.py`

**Endpoints:**

```http
GET    /v1/vault/keys
POST   /v1/vault/keys
PATCH  /v1/vault/keys/{id}
DELETE /v1/vault/keys/{id}
POST   /v1/vault/keys/{id}/test
```

## Phase 4 — Provider Router

### Task 7: Add provider interface and fake provider

**Objective:** Build a fake provider to test routing without paid APIs.

**Files:**
- Modify: `backend/app/providers/base.py`
- Create: `backend/app/providers/fake.py`

**Verify:**

```bash
backend/.venv/bin/python - <<'PY'
import asyncio
from app.providers.fake import FakeProvider
async def main():
    r = await FakeProvider().submit({'prompt':'x'}, 'key')
    assert r.provider_task_id
    print('ok')
asyncio.run(main())
PY
```

Expected: `ok`.

### Task 8: Implement router scoring v0

**Objective:** Select best active key based on priority and state.

**Files:**
- Modify: `backend/app/router/policy.py`

**Verify:** unit test for active > cooldown > disabled selection.

## Phase 5 — Task Queue

### Task 9: Add task creation endpoint

**Objective:** Queue a generation task.

**Files:**
- Create: `backend/app/tasks/routes.py`
- Modify: `backend/app/main.py`

**Endpoints:**

```http
POST /v1/generate/video
GET  /v1/tasks/{id}
GET  /v1/tasks
```

### Task 10: Add RQ worker

**Objective:** Process queued tasks with fake provider.

**Files:**
- Create: `backend/app/workers/provider_worker.py`
- Create: `backend/scripts/run_worker.sh`

**Verify:** submit a task and see it complete.

## Phase 6 — Presets

### Task 11: Add preset seed file

**Objective:** Ship five initial presets.

**Files:**
- Create: `backend/app/presets/defaults.py`
- Create: `backend/app/presets/routes.py`

**Presets:**
- TikTok Girl Dance
- Product Cinematic Reel
- Talking Photo
- Affiliate Hook Reel
- Luxury Product Ad

## Phase 7 — Frontend MVP

### Task 12: Create Next.js app shell

**Objective:** Add dashboard navigation.

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/app/page.tsx`
- Create: `frontend/app/studio/page.tsx`
- Create: `frontend/app/vault/page.tsx`
- Create: `frontend/app/tasks/page.tsx`

### Task 13: Build Motion Studio form

**Objective:** Upload/paste image URL, select preset, submit task, show status.

**Files:**
- Modify: `frontend/app/studio/page.tsx`
- Create: `frontend/lib/api.ts`

### Task 14: Build API Vault UI

**Objective:** Add/list/disable keys.

**Files:**
- Modify: `frontend/app/vault/page.tsx`

## Phase 8 — Verification

### Task 15: End-to-end fake generation test

**Objective:** Prove request -> route -> queue -> provider -> completed task.

**Command:**

```bash
curl -X POST http://localhost:8000/v1/generate/video   -H 'Content-Type: application/json'   -d '{"mode":"image_to_video","prompt":"dance reel","provider":"fake"}'
```

Expected: task id returned, then task becomes completed.

## Rollback

```bash
pkill -f uvicorn || true
pkill -f rq || true
rm -f backend/dev.db
```

## Completion Criteria

- Backend boots.
- Vault CRUD works.
- Fake provider generation works.
- Task queue completes jobs.
- Frontend can submit and inspect tasks.
- Architecture docs match implementation.
