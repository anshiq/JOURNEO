API := services/api
WEB := frontend

.PHONY: setup db-up migrate contracts lint typecheck test build check

setup:
	cd $(API) && uv sync
	cd $(WEB) && npm ci

db-up:
	docker compose -f infra/docker-compose.yml up -d postgres

migrate:
	cd $(API) && uv run alembic upgrade head && uv run python -m app.modules.journeys.backfill

contracts:
	cd $(API) && uv run python -m app.modules.journeys.export
	node scripts/gen-contracts.mjs
	cd $(API) && uv run python ../../scripts/gen_conformance.py

lint:
	cd $(API) && uv run ruff check . && uv run ruff format --check . && uv run lint-imports
	cd $(WEB) && npx biome check .
	node scripts/check-source.mjs
	python3 scripts/check_no_comments.py

typecheck:
	cd $(API) && uv run pyright
	cd $(WEB) && npx tsc -b

test:
	cd $(API) && uv run pytest -n auto
	cd $(WEB) && npx vitest run

build:
	cd $(WEB) && npm run build && npm run size

check: contracts lint typecheck test build
	git diff --exit-code contracts $(WEB)/src/journey/model $(WEB)/src/shared/limits.gen.ts $(WEB)/src/shared/api
	cd $(API) && uv run alembic check
