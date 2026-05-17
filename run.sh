#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
if [ -n "${NEXT_PUBLIC_API_URL:-}" ]; then
  API_URL="$NEXT_PUBLIC_API_URL"
elif [ -n "${PUBLIC_HOST:-}" ]; then
  API_URL="http://${PUBLIC_HOST}:${BACKEND_PORT}"
else
  API_URL="http://localhost:${BACKEND_PORT}"
fi

if [ ! -d backend/.venv ]; then
  echo "[setup] creating backend venv"
  python3 -m venv backend/.venv
fi

echo "[setup] installing backend deps"
backend/.venv/bin/pip install -q -r backend/requirements.txt

echo "[setup] installing frontend deps"
(cd frontend && npm install --silent)

echo "[setup] clearing stale Next.js cache"
rm -rf frontend/.next

cleanup() {
  echo
  echo "[shutdown] stopping services"
  if [ -n "${BACKEND_PID:-}" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

if ss -ltn "sport = :${BACKEND_PORT}" | grep -q LISTEN; then
  echo "[backend] port ${BACKEND_PORT} already in use; reusing existing backend"
else
  echo "[backend] starting on http://0.0.0.0:${BACKEND_PORT}"
  PYTHONPATH=backend backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port "$BACKEND_PORT" &
  BACKEND_PID=$!

  echo "[backend] waiting for health"
  for i in {1..30}; do
    if curl -fsS "http://localhost:${BACKEND_PORT}/health" >/dev/null 2>&1; then
      echo "[backend] ready"
      break
    fi
    sleep 1
  done
fi

echo "[frontend] starting on http://0.0.0.0:${FRONTEND_PORT}"
echo "[frontend] API URL: ${API_URL}"
echo "[open local] http://localhost:${FRONTEND_PORT}"
if [ -n "${PUBLIC_HOST:-}" ]; then
  echo "[open public] http://${PUBLIC_HOST}:${FRONTEND_PORT}"
fi
cd frontend
NEXT_PUBLIC_API_URL="$API_URL" npm run dev -- -p "$FRONTEND_PORT" -H 0.0.0.0
