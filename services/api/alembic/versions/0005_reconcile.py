import secrets

from alembic import op


def raw_execute(sql: str) -> None:
    cursor = op.get_bind().connection.dbapi_connection.cursor()
    try:
        cursor.execute(sql)
    finally:
        cursor.close()


revision = "0005_reconcile"
down_revision = "0004_knowledge_scope"
branch_labels = None
depends_on = None

TIMESTAMPS = {
    "campaigns": ("created_at", "updated_at", "deleted_at"),
    "journeys": ("updated_at",),
    "knowledge_sources": ("created_at",),
    "document_chunks": ("created_at",),
}
FOREIGN_KEYS = (
    ("campaign_slugs", "campaign_id", "campaigns", "CASCADE"),
    ("journeys", "campaign_id", "campaigns", "CASCADE"),
    ("journey_versions", "journey_id", "journeys", "CASCADE"),
    ("journey_draft_checkpoints", "journey_id", "journeys", "CASCADE"),
    ("journey_sessions", "campaign_id", "campaigns", "CASCADE"),
    ("journey_sessions", "version_id", "journey_versions", "SET NULL"),
    ("journey_events", "session_id", "journey_sessions", "CASCADE"),
    ("leads", "campaign_id", "campaigns", "CASCADE"),
    ("leads", "session_id", "journey_sessions", "SET NULL"),
    ("webhook_deliveries", "lead_id", "leads", "CASCADE"),
    ("ai_generation_jobs", "campaign_id", "campaigns", "CASCADE"),
    ("knowledge_sources", "campaign_id", "campaigns", "CASCADE"),
    ("document_chunks", "source_id", "knowledge_sources", "CASCADE"),
    ("document_chunks", "campaign_id", "campaigns", "CASCADE"),
)


def run(sql: str, params: tuple[object, ...] | None = None):
    return op.get_bind().exec_driver_sql(sql, params) if params else op.get_bind().exec_driver_sql(sql)


def column_type(table: str, column: str) -> str | None:
    row = run(
        "SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = %s AND column_name = %s",
        (table, column),
    ).first()
    return row[0] if row else None


def constraint_exists(name: str) -> bool:
    return run("SELECT 1 FROM pg_constraint WHERE conname = %s", (name,)).first() is not None


def drop_fk_on(table: str, column: str) -> None:
    rows = run(
        "SELECT c.conname FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid "
        "JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey) "
        "WHERE c.contype = 'f' AND t.relname = %s AND a.attname = %s",
        (table, column),
    ).fetchall()
    for (name,) in rows:
        run(f'ALTER TABLE {table} DROP CONSTRAINT "{name}"')


def unique_constraint(table: str, columns: tuple[str, ...], name: str) -> None:
    rows = run(
        "SELECT c.conname FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid "
        "WHERE c.contype = 'u' AND t.relname = %s AND c.conname <> %s AND "
        "(SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a WHERE a.attrelid = t.oid "
        "AND a.attnum = ANY(c.conkey)) = %s",
        (table, name, sorted(columns)),
    ).fetchall()
    for (old,) in rows:
        if constraint_exists(name):
            run(f'ALTER TABLE {table} DROP CONSTRAINT "{old}"')
        else:
            run(f'ALTER TABLE {table} RENAME CONSTRAINT "{old}" TO {name}')
    if len(columns) == 1:
        run(f"DROP INDEX IF EXISTS ix_{table}_{columns[0]}")
    if not constraint_exists(name):
        run(f"DROP INDEX IF EXISTS {name}")
        run(f"ALTER TABLE {table} ADD CONSTRAINT {name} UNIQUE ({', '.join(columns)})")


def to_timestamptz(table: str, column: str) -> None:
    if column_type(table, column) == "timestamp without time zone":
        run(f"ALTER TABLE {table} ALTER COLUMN {column} TYPE TIMESTAMPTZ USING {column} AT TIME ZONE 'UTC'")


def reconcile_campaigns() -> None:
    run("ALTER TABLE campaigns ALTER COLUMN id TYPE TEXT")
    run("UPDATE campaigns SET name = 'Untitled' WHERE name IS NULL")
    run("ALTER TABLE campaigns ALTER COLUMN name TYPE VARCHAR(80) USING LEFT(name, 80)")
    run("UPDATE campaigns SET audience = '' WHERE audience IS NULL")
    run("ALTER TABLE campaigns ALTER COLUMN audience TYPE VARCHAR(300) USING LEFT(audience, 300)")
    run("ALTER TABLE campaigns ALTER COLUMN audience SET DEFAULT ''")
    run("ALTER TABLE campaigns ALTER COLUMN audience SET NOT NULL")
    for (cid,) in run("SELECT id FROM campaigns WHERE dev_token IS NULL OR dev_token = ''").fetchall():
        run("UPDATE campaigns SET dev_token = %s WHERE id = %s", (secrets.token_urlsafe(24), cid))
    for (cid,) in run(
        "SELECT id FROM campaigns WHERE webhook_secret IS NULL OR webhook_secret IN ('', 'secret')"
    ).fetchall():
        run("UPDATE campaigns SET webhook_secret = %s WHERE id = %s", (secrets.token_hex(24), cid))
    run("ALTER TABLE campaigns ALTER COLUMN dev_token TYPE TEXT")
    run("ALTER TABLE campaigns ALTER COLUMN dev_token SET NOT NULL")
    run("ALTER TABLE campaigns ALTER COLUMN webhook_secret DROP DEFAULT")
    run("ALTER TABLE campaigns ALTER COLUMN webhook_secret SET NOT NULL")
    run("ALTER TABLE campaigns ALTER COLUMN slug DROP DEFAULT")
    run("ALTER TABLE campaigns ALTER COLUMN slug SET NOT NULL")
    for column in ("description", "objective", "status", "dev_token_created_at"):
        if column_type("campaigns", column):
            run(f"ALTER TABLE campaigns ALTER COLUMN {column} DROP NOT NULL")
    for column in ("created_at", "updated_at"):
        to_timestamptz("campaigns", column)
        run(f"UPDATE campaigns SET {column} = now() WHERE {column} IS NULL")
        run(f"ALTER TABLE campaigns ALTER COLUMN {column} SET DEFAULT now()")
        run(f"ALTER TABLE campaigns ALTER COLUMN {column} SET NOT NULL")
    to_timestamptz("campaigns", "deleted_at")
    unique_constraint("campaigns", ("slug",), "uq_campaigns_slug")
    unique_constraint("campaigns", ("dev_token",), "uq_campaigns_dev_token")


def reconcile_journeys() -> None:
    if column_type("journeys", "graph_json"):
        run(
            "UPDATE journeys SET legacy_graph_json = graph_json WHERE legacy_graph_json IS NULL "
            "AND schema_version < 4 AND draft_doc = '{}'::jsonb"
        )
    run("ALTER TABLE journeys ALTER COLUMN id TYPE TEXT")
    run("ALTER TABLE journeys ALTER COLUMN campaign_id TYPE TEXT")
    run("ALTER TABLE journeys ALTER COLUMN draft_hash TYPE CHAR(64) USING rpad(COALESCE(draft_hash, ''), 64, '0')")
    run("ALTER TABLE journeys ALTER COLUMN draft_hash DROP DEFAULT")
    run("ALTER TABLE journeys ALTER COLUMN draft_doc DROP DEFAULT")
    run("ALTER TABLE journeys ALTER COLUMN schema_version DROP DEFAULT")
    for column in ("draft_doc", "draft_hash", "schema_version"):
        run(f"ALTER TABLE journeys ALTER COLUMN {column} SET NOT NULL")
    for column in ("name", "graph_json", "status", "version", "created_at"):
        if column_type("journeys", column):
            run(f"ALTER TABLE journeys ALTER COLUMN {column} DROP NOT NULL")
    run("ALTER TABLE journeys ADD COLUMN IF NOT EXISTS migration_issues JSONB")
    run("ALTER TABLE journeys ADD COLUMN IF NOT EXISTS last_checkpoint_at TIMESTAMPTZ")
    if column_type("journeys", "updated_at") is None:
        run("ALTER TABLE journeys ADD COLUMN updated_at TIMESTAMPTZ")
    to_timestamptz("journeys", "updated_at")
    run("UPDATE journeys SET updated_at = now() WHERE updated_at IS NULL")
    run("ALTER TABLE journeys ALTER COLUMN updated_at SET DEFAULT now()")
    run("ALTER TABLE journeys ALTER COLUMN updated_at SET NOT NULL")
    unique_constraint("journeys", ("campaign_id",), "uq_journeys_campaign_id")
    run(
        "UPDATE journeys SET live_version_id = NULL WHERE live_version_id IS NOT NULL AND NOT EXISTS "
        "(SELECT 1 FROM journey_versions v WHERE v.id = journeys.live_version_id)"
    )
    if not constraint_exists("fk_journeys_live_version_id_journey_versions"):
        run(
            "ALTER TABLE journeys ADD CONSTRAINT fk_journeys_live_version_id_journey_versions FOREIGN KEY "
            "(live_version_id) REFERENCES journey_versions(id) DEFERRABLE INITIALLY DEFERRED"
        )
    unique_constraint("journey_versions", ("journey_id", "version_no"), "uq_journey_versions_journey_id_version_no")
    unique_constraint("journey_events", ("session_id", "seq"), "uq_journey_events_session_id_seq")


def reconcile_knowledge() -> None:
    if column_type("knowledge_sources", "type") and not column_type("knowledge_sources", "kind"):
        run("ALTER TABLE knowledge_sources RENAME COLUMN type TO kind")
    run("ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS kind VARCHAR(8)")
    run(
        "UPDATE knowledge_sources SET kind = CASE WHEN kind IN ('url', 'pdf', 'qa') THEN kind "
        "WHEN kind IN ('web', 'website') THEN 'url' ELSE 'qa' END"
    )
    run("ALTER TABLE knowledge_sources ALTER COLUMN kind TYPE VARCHAR(8)")
    run("ALTER TABLE knowledge_sources ALTER COLUMN kind SET NOT NULL")
    run("UPDATE knowledge_sources SET title = COALESCE(NULLIF(title, ''), 'Source')")
    run("ALTER TABLE knowledge_sources ALTER COLUMN title TYPE VARCHAR(200) USING LEFT(title, 200)")
    run("ALTER TABLE knowledge_sources ALTER COLUMN title SET NOT NULL")
    run("ALTER TABLE knowledge_sources ALTER COLUMN uri TYPE VARCHAR(2048) USING LEFT(uri, 2048)")
    run("ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb")
    drop_fk_on("document_chunks", "source_id")
    if column_type("knowledge_sources", "id") != "text":
        run("ALTER TABLE knowledge_sources ALTER COLUMN id DROP DEFAULT")
        run("ALTER TABLE knowledge_sources ALTER COLUMN id TYPE TEXT USING id::text")
        run("DROP SEQUENCE IF EXISTS knowledge_sources_id_seq")
    run("ALTER TABLE knowledge_sources ALTER COLUMN campaign_id TYPE TEXT")
    run(
        "UPDATE knowledge_sources SET campaign_id = NULL WHERE campaign_id IS NOT NULL AND NOT EXISTS "
        "(SELECT 1 FROM campaigns c WHERE c.id = knowledge_sources.campaign_id)"
    )
    to_timestamptz("knowledge_sources", "created_at")
    run("UPDATE knowledge_sources SET created_at = now() WHERE created_at IS NULL")
    run("ALTER TABLE knowledge_sources ALTER COLUMN created_at SET DEFAULT now()")
    run("ALTER TABLE knowledge_sources ALTER COLUMN created_at SET NOT NULL")
    run(
        "UPDATE knowledge_sources SET status = 'ready' WHERE status = 'pending' AND id IN (SELECT source_id::text FROM document_chunks)"
    )
    run("ALTER TABLE document_chunks DROP COLUMN IF EXISTS tsv")
    run("ALTER TABLE document_chunks DROP COLUMN IF EXISTS embedding_id")
    run("ALTER TABLE document_chunks ALTER COLUMN id TYPE BIGINT")
    run("ALTER TABLE document_chunks ALTER COLUMN source_id TYPE TEXT USING source_id::text")
    run("DELETE FROM document_chunks WHERE source_id IS NULL OR source_id NOT IN (SELECT id FROM knowledge_sources)")
    run(
        "UPDATE document_chunks SET campaign_id = s.campaign_id FROM knowledge_sources s "
        "WHERE s.id = document_chunks.source_id AND document_chunks.campaign_id IS NULL"
    )
    run(
        "UPDATE document_chunks SET campaign_id = NULL WHERE campaign_id IS NOT NULL AND NOT EXISTS "
        "(SELECT 1 FROM campaigns c WHERE c.id = document_chunks.campaign_id)"
    )
    run("UPDATE document_chunks SET chunk_index = 0 WHERE chunk_index IS NULL")
    run("UPDATE document_chunks SET content = '' WHERE content IS NULL")
    run("ALTER TABLE document_chunks ALTER COLUMN source_id SET NOT NULL")
    run("ALTER TABLE document_chunks ALTER COLUMN chunk_index SET NOT NULL")
    run("ALTER TABLE document_chunks ALTER COLUMN content SET NOT NULL")
    to_timestamptz("document_chunks", "created_at")
    run("UPDATE document_chunks SET created_at = now() WHERE created_at IS NULL")
    run("ALTER TABLE document_chunks ALTER COLUMN created_at SET DEFAULT now()")
    run("ALTER TABLE document_chunks ALTER COLUMN created_at SET NOT NULL")
    run(
        "ALTER TABLE document_chunks ADD COLUMN tsv TSVECTOR GENERATED ALWAYS AS "
        "(to_tsvector('english'::regconfig, content)) STORED"
    )
    run("CREATE INDEX IF NOT EXISTS ix_chunks_tsv ON document_chunks USING gin (tsv)")
    run("CREATE INDEX IF NOT EXISTS ix_chunks_campaign ON document_chunks (campaign_id)")


def reconcile_foreign_keys() -> None:
    for table, column, parent, action in FOREIGN_KEYS:
        name = f"fk_{table}_{column}_{parent}"
        nullable = action == "SET NULL" or (table, column) in {
            ("knowledge_sources", "campaign_id"),
            ("document_chunks", "campaign_id"),
        }
        if nullable:
            run(
                f"UPDATE {table} SET {column} = NULL WHERE {column} IS NOT NULL AND NOT EXISTS "
                f"(SELECT 1 FROM {parent} p WHERE p.id = {table}.{column})"
            )
        else:
            run(f"DELETE FROM {table} WHERE NOT EXISTS (SELECT 1 FROM {parent} p WHERE p.id = {table}.{column})")
        if constraint_exists(name):
            continue
        drop_fk_on(table, column)
        run(
            f"ALTER TABLE {table} ADD CONSTRAINT {name} FOREIGN KEY ({column}) REFERENCES {parent}(id) ON DELETE {action}"
        )


def reconcile_indexes() -> None:
    run(
        "CREATE INDEX IF NOT EXISTS ix_checkpoints_journey_created ON journey_draft_checkpoints (journey_id, created_at DESC)"
    )
    run("CREATE INDEX IF NOT EXISTS ix_sessions_campaign_started ON journey_sessions (campaign_id, started_at DESC)")
    run("CREATE INDEX IF NOT EXISTS ix_events_campaign_type_created ON journey_events (campaign_id, type, created_at)")
    run("CREATE INDEX IF NOT EXISTS ix_events_created_brin ON journey_events USING brin (created_at)")
    run("CREATE INDEX IF NOT EXISTS ix_leads_campaign_created ON leads (campaign_id, created_at DESC, id DESC)")
    run(
        "CREATE INDEX IF NOT EXISTS ix_leads_campaign_email ON leads (campaign_id, normalized_email) "
        "WHERE normalized_email IS NOT NULL"
    )
    run(
        "CREATE INDEX IF NOT EXISTS ix_leads_campaign_phone ON leads (campaign_id, normalized_phone) "
        "WHERE normalized_phone IS NOT NULL"
    )


def upgrade() -> None:
    from procrastinate.schema import SchemaManager

    if not run("SELECT to_regproc('procrastinate_fetch_job_v2') IS NOT NULL").scalar():
        run("DROP TABLE IF EXISTS procrastinate_jobs CASCADE")
        raw_execute(SchemaManager.get_schema())
    reconcile_campaigns()
    reconcile_journeys()
    reconcile_knowledge()
    reconcile_foreign_keys()
    reconcile_indexes()


def downgrade() -> None:
    raise NotImplementedError
