from alembic import op

revision = "0004_knowledge_scope"
down_revision = "0003_tasks"
branch_labels = None
depends_on = None


def upgrade() -> None:
    run = op.get_bind().exec_driver_sql
    run("ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS campaign_id TEXT")
    run("ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS status VARCHAR(8) NOT NULL DEFAULT 'pending'")
    run("ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS error VARCHAR(300)")
    run(
        "UPDATE knowledge_sources SET campaign_id = substring(uri FROM 10) "
        "WHERE campaign_id IS NULL AND left(uri, 9) = 'campaign:'"
    )
    run("ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS campaign_id TEXT")
    run("DROP TABLE IF EXISTS document_embeddings")


def downgrade() -> None:
    raise NotImplementedError
