from sqlalchemy import create_engine, text

import app.modules.models_registry
from alembic import context
from app.core.config import get_settings
from app.core.db import Base

target_metadata = Base.metadata
REGISTERED = app.modules.models_registry.MODELS
LEGACY_TABLES = {"legacy_orphan_journeys"}
LEGACY_COLUMNS = {
    "campaigns": {"description", "objective", "status", "dev_token_created_at"},
    "journeys": {"name", "graph_json", "status", "version", "created_at"},
}
SKIPPED_INDEXES = {"ix_events_created_brin"}


def include_object(obj, name, type_, reflected, compare_to):
    if type_ == "table" and (name.startswith("procrastinate_") or name in LEGACY_TABLES):
        return False
    if type_ == "column" and reflected and compare_to is None:
        return name not in LEGACY_COLUMNS.get(obj.table.name, set())
    return not (type_ == "index" and name in SKIPPED_INDEXES)


def run_migrations_online() -> None:
    raw = context.config.get_main_option("sqlalchemy.url") or get_settings().database_dsn
    url = raw.replace("postgresql://", "postgresql+psycopg://", 1)
    engine = create_engine(url)
    with engine.connect() as connection:
        connection.execute(text("SELECT pg_advisory_lock(7342001)"))
        connection.commit()
        try:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                compare_type=True,
                include_object=include_object,
                transaction_per_migration=True,
            )
            with context.begin_transaction():
                context.run_migrations()
            connection.commit()
        finally:
            connection.rollback()
            connection.execute(text("SELECT pg_advisory_unlock(7342001)"))
            connection.commit()
    engine.dispose()


run_migrations_online()
