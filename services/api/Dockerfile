FROM python:3.13-slim AS base
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
WORKDIR /app

FROM base AS build
COPY --from=ghcr.io/astral-sh/uv:0.11 /uv /bin/uv
COPY services/api/pyproject.toml services/api/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY services/api/ ./
RUN uv sync --frozen --no-dev

FROM base AS runtime
RUN useradd --create-home --uid 10001 app
COPY --from=build --chown=app:app /app /app
COPY --chown=app:app contracts /contracts
ENV PATH="/app/.venv/bin:$PATH" CONTRACTS_DIR=/contracts
USER app
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && python -m app.modules.journeys.backfill && python -m app.seeds && exec uvicorn app.main:create_app --factory --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*' --workers ${WEB_CONCURRENCY:-1} --no-access-log --no-server-header"]
