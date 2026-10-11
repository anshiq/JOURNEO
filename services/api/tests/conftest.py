import os
from collections.abc import AsyncIterator

import psycopg
import pytest
from alembic.config import Config
from httpx import ASGITransport, AsyncClient
from procrastinate.testing import InMemoryConnector
from psycopg import sql
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from alembic import command
from app.core import db
from app.core.config import LlmSettings, Settings, WorkerSettings
from app.core.tasks import task_app
from app.main import create_app
from app.modules.journeys import library
from app.modules.runtime import doc_cache
from app.modules.runtime.page import page_templates

ADMIN_URL = os.environ.get("TEST_DATABASE_URL", "postgresql://journeo:journeo_dev@localhost:5437/postgres")
TEMPLATE = (
    '<!doctype html><html><head><meta charset="utf-8"><meta name="jx-head-slot" /></head>'
    '<body><div id="jx-player"></div><script id="jx-doc" type="application/json">null</script>'
    '<script type="module" src="/assets/player.js"></script></body></html>'
)


def database_name(worker: str) -> str:
    return f"journeo_test_{worker}"


def url_for(name: str) -> str:
    return ADMIN_URL.rsplit("/", 1)[0] + f"/{name}"


def recreate(name: str) -> None:
    with psycopg.connect(ADMIN_URL, autocommit=True) as conn:
        conn.execute(sql.SQL("DROP DATABASE IF EXISTS {} WITH (FORCE)").format(sql.Identifier(name)))
        conn.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(name)))


def migrate(url: str) -> None:
    cfg = Config(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(os.path.dirname(__file__), "..", "alembic"))
    cfg.set_main_option("sqlalchemy.url", url)
    command.upgrade(cfg, "head")


@pytest.fixture(scope="session")
def worker_id() -> str:
    return os.environ.get("PYTEST_XDIST_WORKER", "main")


@pytest.fixture(scope="session")
def database_url(worker_id: str) -> str:
    name = database_name(worker_id)
    recreate(name)
    url = url_for(name)
    migrate(url)
    return url


@pytest.fixture(scope="session")
def settings(database_url: str) -> Settings:
    return Settings(
        database_url=database_url,
        rate_limit_enabled=False,
        worker=WorkerSettings(mode="off"),
        llm=LlmSettings(mode="off"),
        e2e=True,
        public_base_url="https://journeo.test",
        frontend_origin="http://frontend.invalid",
    )


@pytest.fixture(scope="session")
async def engine(settings: Settings) -> AsyncIterator[AsyncEngine]:
    engine = db.make_engine(settings.database_dsn, pool_size=5)
    yield engine
    await engine.dispose()


@pytest.fixture(scope="session", autouse=True)
async def task_queue() -> AsyncIterator[InMemoryConnector]:
    connector = InMemoryConnector()
    with task_app.replace_connector(connector):
        async with task_app.open_async():
            yield connector


@pytest.fixture(autouse=True)
def clean_state(task_queue: InMemoryConnector) -> None:
    task_queue.reset()
    doc_cache.clear()
    page_templates.template = TEMPLATE
    page_templates.etag = "tpl"


@pytest.fixture
async def session(engine: AsyncEngine) -> AsyncIterator[AsyncSession]:
    async with engine.connect() as conn:
        outer = await conn.begin()
        async with AsyncSession(bind=conn, join_transaction_mode="create_savepoint", expire_on_commit=False) as s:
            yield s
        await outer.rollback()


@pytest.fixture
def app(settings: Settings, session: AsyncSession):
    library.load(settings)
    application = create_app(settings)

    async def override() -> AsyncIterator[AsyncSession]:
        async with session.begin_nested():
            yield session

    application.dependency_overrides[db.get_session] = override
    return application


@pytest.fixture
async def client(app) -> AsyncIterator[AsyncClient]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
