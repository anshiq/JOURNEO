import asyncio
from contextlib import asynccontextmanager

from app.core import db
from app.core.logging import log_event, setup_logging
from app.core.tasks import make_connector, task_app
from app.modules.ai.mock import install as install_mock_llm
from app.modules.journeys import library
from app.modules.ops.keepalive import run_keepalive
from app.modules.runtime.page import page_templates


@asynccontextmanager
async def lifespan(app):
    settings = app.state.settings
    setup_logging(settings.log_level)
    library.load(settings)
    if settings.llm.mode == "mock":
        install_mock_llm()
    await db.connect(settings)
    background: list[asyncio.Task[None]] = []
    with task_app.replace_connector(make_connector(settings.database_dsn)):
        async with task_app.open_async():
            if settings.worker.mode == "inprocess":
                background.append(
                    asyncio.create_task(
                        task_app.run_worker_async(
                            queues=settings.worker.queues,
                            concurrency=settings.worker.concurrency,
                            install_signal_handlers=False,
                        )
                    )
                )
            if settings.keepalive.enabled:
                background.append(asyncio.create_task(run_keepalive(settings.keepalive)))
            background.append(asyncio.create_task(page_templates.refresh_forever(settings)))
            if settings.seed_on_start:
                from app.seeds import seed_demo

                await seed_demo()
            log_event("app started", event="startup", service=settings.service)
            try:
                yield
            finally:
                for task in background:
                    task.cancel()
                await asyncio.gather(*background, return_exceptions=True)
    await db.dispose()
