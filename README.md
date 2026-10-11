# Journeo

Journeo lets a non-technical creator build a campaign journey (screens, questions, branches and copy), design it, publish a live link and read the results. An optional AI assistant drafts and rewrites the journey; without a model the editor still works with templates and a deterministic composer.

## Layout

| Path | What it holds |
| --- | --- |
| `frontend/src/editor` | Creator workspace: campaigns list, workspace tabs, inline editing, rewrites, publishing |
| `frontend/src/player` | Visitor player for live links (`/c/<slug>`), dev previews (`/d/<token>`) and fixtures |
| `frontend/src/journey` | Pure journey model, operations and engine (no I/O, clocks or randomness) |
| `frontend/src/experience` | Renderer shared by the editor canvas and the player |
| `services/api` | FastAPI, SQLAlchemy 2 and Alembic. Modules live in `app/modules`; import-linter enforces the layers |
| `contracts` | Generated artifacts: OpenAPI, JSON Schema, conformance corpus, and the template, recipe and preset library |
| `scripts` | Contract generation, source and comment checks, player size budget, Lighthouse campaign seed |
| `infra` | Local Docker Compose: Postgres 16 with pgvector on port 5437, LocalStack |
| `.github/workflows` | `ci.yml` (lint, tests, build, contracts, e2e) and `nightly.yml` (Lighthouse) |

## Requirements

- Python 3.14 with [uv](https://docs.astral.sh/uv/)
- Node 22.23
- Docker, for the local Postgres
- Google Chrome, for the end-to-end and Lighthouse runs

## Local setup

1. Install dependencies: `make setup`
2. Start Postgres: `make db-up` (listens on `localhost:5437`, user `journeo`, password `journeo_dev`)
3. Create the API configuration in `services/api/.env`:

   ```
   DATABASE_URL=postgresql://journeo:journeo_dev@localhost:5437/journeo
   FRONTEND_ORIGIN=http://localhost:5173
   PUBLIC_BASE_URL=http://localhost:5173
   ```

   Add `LLM__API_KEY` to enable the AI features. Without it the AI endpoints return 503 and the editor shows "AI is not set up".
4. Apply migrations and the v3 backfill: `make migrate`
5. Load the demo campaigns (optional): `cd services/api && uv run python -m app.seeds`
6. Start the API: `cd services/api && uv run uvicorn app.main:create_app --factory --reload --port 8000`
7. Start the frontend: `cd frontend && npm run dev` and open <http://localhost:5173>

The Vite dev server proxies `/api` and `/c/` to `VITE_API_PROXY`, which defaults to `http://localhost:8000`.

Processes can also be started and watched through agent-runtime (`start_process` with the commands above). Its project config lives in `.agent-runtime/`.

## Make targets

| Target | What it does |
| --- | --- |
| `make setup` | `uv sync` for the API and `npm ci` for the frontend |
| `make db-up` | Starts the local Postgres container |
| `make migrate` | `alembic upgrade head`, then the v3 to v4 backfill |
| `make contracts` | Regenerates OpenAPI, the TypeScript client, JSON Schema and the conformance corpus. Run it after any API or schema change |
| `make lint` | ruff, ruff format, import-linter, Biome, source checks and the no-comments check |
| `make typecheck` | pyright and `tsc -b` |
| `make test` | pytest and vitest |
| `make build` | Production frontend build and the player size budget |
| `make check` | Everything above, then checks that generated files are unchanged and `alembic check` passes |

## Tests

- API: `cd services/api && uv run pytest -n auto`. Tests create `journeo_test_<worker>` databases on the local Postgres.
- Frontend unit tests: `cd frontend && npm test`
- End-to-end: serve the built frontend with `npm run build && npm run preview` (port 4173) and run the API with `FRONTEND_ORIGIN=http://127.0.0.1:4173`. Then run `cd frontend && BASE_URL=http://127.0.0.1:4173 API_URL=http://127.0.0.1:8000 npm run e2e`.

  The public `/c/<slug>` page is built from the player template served by `FRONTEND_ORIGIN`. If that origin is wrong, the page stays on "Loading…".
- Lighthouse (mobile, performance at least 0.85 on `/c/lighthouse-template`): seed the campaign with `API_URL=http://127.0.0.1:8000 node scripts/lhci-seed.mjs`, serve the frontend on port 4173, then run `cd frontend && CHROME_PATH=<chrome> npm run lhci`.

## Configuration

API variables are read from the environment or `services/api/.env`. Frontend variables are read by Vite at build time or dev start.

| Variable | Read by | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | API | `postgresql://journeo:journeo_dev@localhost:5437/journeo` | Postgres connection |
| `FRONTEND_ORIGIN` | API | `http://localhost:5173` | Origin the API fetches the player template from (`/play.html`) for public pages |
| `PUBLIC_BASE_URL` | API | `http://localhost:5173` | Absolute base for public links |
| `CORS_ORIGINS` | API | empty | JSON list of allowed origins. Empty when the Vite proxy is used |
| `EDITOR_TOKEN` | API | unset | When set, editor routes require this password |
| `SENTRY_DSN` | API | unset | Enables error reporting. Empty or unset means nothing is initialised |
| `LLM__MODE` | API | `live` | `live`, `mock` or `off` |
| `LLM__API_KEY` | API | empty | OpenRouter key for `live` mode |
| `LLM__MODEL` | API | `google/gemma-4-31b-it:free` | Model used for drafting and rewrites |
| `LLM__BASE_URL` | API | `https://openrouter.ai/api/v1` | Model endpoint |
| `SEED_ON_START` | Container start | `false` | Seeds demo campaigns on boot. Keep `false` in production |
| `STORAGE__DRIVER` | API | `auto` | `auto`, `db` or `s3` for uploaded images |
| `WORKER__MODE` | API | `inprocess` | `inprocess`, `external` or `off` for background jobs |
| `VITE_API_BASE` | Frontend build | empty | API origin when it differs from the frontend origin |
| `VITE_API_PROXY` | Frontend dev and preview | `http://localhost:8000` | Target of the `/api` and `/c/` proxy |
| `VITE_SENTRY_DSN` | Frontend build | unset | Enables error reporting. The Sentry SDK loads only when this is set |
| `API_URL` | E2E and seed scripts | `http://localhost:8000` | API origin for test setup requests |

`.env.example` at the root lists the variables with example values.

## Production

`render.yaml` defines two services: `journeo-api` (Docker image from `services/api/Dockerfile`) and `journeo-frontend` (static build served by nginx). The API image runs `alembic upgrade head`, the backfill and, when `SEED_ON_START=true`, the seeds, then starts uvicorn. Health is checked at `/health`.

The step-by-step production migration and rollback procedure is in [docs/runbook.md](docs/runbook.md).

## Status

Open work, decisions and risks are tracked in [plan.md](plan.md) and [implementation_plan.md](implementation_plan.md).
