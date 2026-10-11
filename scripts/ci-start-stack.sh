#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/services/api"
uv run alembic upgrade head
FRONTEND_ORIGIN=http://127.0.0.1:4173 PUBLIC_BASE_URL=http://127.0.0.1:4173 \
  nohup uv run uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8100 --no-access-log > "$ROOT/api.log" 2>&1 &
cd "$ROOT/frontend"
npm run build
VITE_API_PROXY=http://127.0.0.1:8100 nohup npx vite preview --host 127.0.0.1 --port 4173 --strictPort > "$ROOT/web.log" 2>&1 &
for _ in $(seq 1 60); do curl -sf http://127.0.0.1:8100/ready >/dev/null && break || sleep 2; done
for _ in $(seq 1 60); do curl -sf http://127.0.0.1:4173/play.html >/dev/null && break || sleep 2; done
