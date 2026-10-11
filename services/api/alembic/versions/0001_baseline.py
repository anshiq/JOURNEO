revision = "0001_baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    from alembic import op

    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.execute(
        "CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY, name VARCHAR(80) NOT NULL, description TEXT NOT NULL DEFAULT '', objective TEXT NOT NULL DEFAULT '', audience TEXT NOT NULL DEFAULT '', status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ, dev_token TEXT UNIQUE NOT NULL, dev_token_created_at TIMESTAMPTZ NOT NULL DEFAULT now())"
    )
    op.execute(
        "CREATE TABLE IF NOT EXISTS journeys (id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, name VARCHAR(80) NOT NULL DEFAULT 'Journey', graph_json TEXT NOT NULL DEFAULT '{}', status VARCHAR(16) NOT NULL DEFAULT 'DRAFT', version INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())"
    )
    op.execute(
        "CREATE TABLE IF NOT EXISTS knowledge_sources (id SERIAL PRIMARY KEY, type VARCHAR(16), title VARCHAR(200), uri TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())"
    )
    op.execute(
        "CREATE TABLE IF NOT EXISTS document_chunks (id SERIAL PRIMARY KEY, source_id INTEGER, chunk_index INTEGER, content TEXT, embedding_id VARCHAR(64), created_at TIMESTAMPTZ NOT NULL DEFAULT now())"
    )


def downgrade() -> None:
    raise NotImplementedError()
