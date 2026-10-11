from collections.abc import AsyncGenerator, AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

import orjson
from sqlalchemy import MetaData
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import Settings

NAMING = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING)


engine: AsyncEngine | None = None
sessions: async_sessionmaker[AsyncSession] | None = None


def _dumps(value: Any) -> str:
    return orjson.dumps(value).decode()


def async_url(dsn: str) -> str:
    return dsn.replace("postgresql://", "postgresql+psycopg://", 1)


def make_engine(dsn: str, **kwargs: Any) -> AsyncEngine:
    return create_async_engine(
        async_url(dsn),
        pool_pre_ping=True,
        json_serializer=_dumps,
        json_deserializer=orjson.loads,
        connect_args={"options": "-c statement_timeout=15000 -c idle_in_transaction_session_timeout=30000"},
        **kwargs,
    )


async def connect(settings: Settings) -> None:
    global engine, sessions
    engine = make_engine(settings.database_dsn, pool_size=5, max_overflow=5)
    sessions = async_sessionmaker(engine, expire_on_commit=False)


def bind(new_sessions: async_sessionmaker[AsyncSession] | None) -> None:
    global sessions
    sessions = new_sessions


async def get_session() -> AsyncIterator[AsyncSession]:
    if sessions is None:
        raise RuntimeError("database not connected")
    async with sessions() as session, session.begin():
        yield session


@asynccontextmanager
async def session_scope() -> AsyncGenerator[AsyncSession]:
    if sessions is None:
        raise RuntimeError("database not connected")
    async with sessions() as session, session.begin():
        yield session


async def dispose() -> None:
    global engine, sessions
    if engine is not None:
        await engine.dispose()
    engine = None
    sessions = None
