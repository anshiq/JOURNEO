import sentry_sdk
from fastapi import FastAPI
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

from app.core.config import Settings, get_settings
from app.core.context import RequestContextMiddleware
from app.core.errors import install_error_handlers
from app.core.limits_mw import BodyLimitMiddleware
from app.lifespan import lifespan
from app.modules.ai import router as ai
from app.modules.assistant import router as assistant
from app.modules.campaigns import router as campaigns
from app.modules.journeys import router as journeys
from app.modules.leads import router as leads
from app.modules.media import router as media
from app.modules.ops import router as ops
from app.modules.results import router as results
from app.modules.runtime import router as runtime


def init_sentry(settings: Settings) -> None:
    if not settings.sentry_dsn:
        return
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        integrations=[StarletteIntegration(), FastApiIntegration()],
        traces_sample_rate=0.0,
        send_default_pii=False,
    )


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    init_sentry(settings)
    app = FastAPI(
        title="Journeo API",
        version="1",
        lifespan=lifespan,
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        redoc_url=None,
    )
    app.state.settings = settings
    app.add_middleware(BodyLimitMiddleware)
    app.add_middleware(RequestContextMiddleware, service=settings.service)
    if settings.cors_origins:
        from fastapi.middleware.cors import CORSMiddleware

        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_methods=["*"],
            allow_headers=["*"],
            expose_headers=["ETag", "x-request-id"],
            max_age=600,
        )
    install_error_handlers(app)
    for router in (
        ai.router,
        ai.generate_router,
        campaigns.router,
        journeys.router,
        runtime.router,
        leads.router,
        results.router,
        assistant.router,
        media.router,
        media.public_router,
        ops.router,
    ):
        app.include_router(router)
    if settings.e2e:
        from app.modules.ops.test_reset import router as test_router

        app.include_router(test_router)
    return app
