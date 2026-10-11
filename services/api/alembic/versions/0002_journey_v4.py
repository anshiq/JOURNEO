import re
import secrets
import unicodedata

from alembic import op

revision = "0002_journey_v4"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None


def slug_base(name: str) -> str:
    folded = "".join(c for c in unicodedata.normalize("NFKD", name or "") if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", folded.lower()).strip("-")[:60] or "campaign"


def has_column(table: str, column: str) -> bool:
    row = (
        op.get_bind()
        .exec_driver_sql(
            "SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = %s AND column_name = %s",
            (table, column),
        )
        .first()
    )
    return row is not None


def upgrade() -> None:
    run = op.get_bind().exec_driver_sql
    for ddl in (
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS slug VARCHAR(60)",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS brief VARCHAR(2000) NOT NULL DEFAULT ''",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS goal VARCHAR(32)",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS webhook_secret TEXT",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ",
    ):
        run(ddl)
    if has_column("campaigns", "description"):
        run("UPDATE campaigns SET brief = LEFT(COALESCE(description, ''), 2000) WHERE brief = ''")
    taken: set[str] = set()
    for cid, name, slug in run("SELECT id, name, slug FROM campaigns ORDER BY created_at, id").fetchall():
        if slug:
            taken.add(slug)
            continue
        base = slug_base(name)
        candidate, n = base, 2
        while candidate in taken:
            suffix = f"-{n}"
            candidate = base[: 60 - len(suffix)] + suffix
            n += 1
        taken.add(candidate)
        run("UPDATE campaigns SET slug = %s WHERE id = %s", (candidate, cid))
    for (cid,) in run(
        "SELECT id FROM campaigns WHERE webhook_secret IS NULL OR webhook_secret IN ('', 'secret')"
    ).fetchall():
        run("UPDATE campaigns SET webhook_secret = %s WHERE id = %s", (secrets.token_hex(24), cid))
    run("CREATE UNIQUE INDEX IF NOT EXISTS uq_campaigns_slug ON campaigns (slug)")
    run(
        "CREATE TABLE IF NOT EXISTS campaign_slugs (slug VARCHAR(60) PRIMARY KEY, "
        "campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT now())"
    )
    run(
        "CREATE TABLE IF NOT EXISTS legacy_orphan_journeys (id TEXT PRIMARY KEY, payload JSONB NOT NULL, "
        "created_at TIMESTAMPTZ NOT NULL DEFAULT now())"
    )
    run(
        "INSERT INTO legacy_orphan_journeys (id, payload) SELECT j.id, to_jsonb(j) FROM journeys j "
        "WHERE NOT EXISTS (SELECT 1 FROM campaigns c WHERE c.id = j.campaign_id) ON CONFLICT (id) DO NOTHING"
    )
    run("DELETE FROM journeys j WHERE NOT EXISTS (SELECT 1 FROM campaigns c WHERE c.id = j.campaign_id)")
    order = "j.created_at DESC NULLS LAST, j.id DESC" if has_column("journeys", "created_at") else "j.id DESC"
    run(
        "WITH ranked AS (SELECT j.id, row_number() OVER (PARTITION BY j.campaign_id ORDER BY "
        f"{order}) AS rn FROM journeys j) "
        "INSERT INTO legacy_orphan_journeys (id, payload) SELECT j.id, to_jsonb(j) FROM journeys j "
        "JOIN ranked r ON r.id = j.id WHERE r.rn > 1 ON CONFLICT (id) DO NOTHING"
    )
    run(
        "WITH ranked AS (SELECT j.id, row_number() OVER (PARTITION BY j.campaign_id ORDER BY "
        f"{order}) AS rn FROM journeys j) "
        "DELETE FROM journeys WHERE id IN (SELECT id FROM ranked WHERE rn > 1)"
    )
    for ddl in (
        "ALTER TABLE journeys ADD COLUMN IF NOT EXISTS draft_doc JSONB",
        "ALTER TABLE journeys ADD COLUMN IF NOT EXISTS draft_revision INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE journeys ADD COLUMN IF NOT EXISTS draft_hash CHAR(64)",
        "ALTER TABLE journeys ADD COLUMN IF NOT EXISTS schema_version INTEGER",
        "ALTER TABLE journeys ADD COLUMN IF NOT EXISTS live_version_id TEXT",
        "ALTER TABLE journeys ADD COLUMN IF NOT EXISTS paused BOOLEAN NOT NULL DEFAULT false",
        "ALTER TABLE journeys ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ",
        'ALTER TABLE journeys ADD COLUMN IF NOT EXISTS ended JSONB NOT NULL DEFAULT \'{"kind": "message"}\'::jsonb',
        "ALTER TABLE journeys ADD COLUMN IF NOT EXISTS leads_webhook JSONB",
        "ALTER TABLE journeys ADD COLUMN IF NOT EXISTS editor_state JSONB NOT NULL DEFAULT '{}'::jsonb",
        "ALTER TABLE journeys ADD COLUMN IF NOT EXISTS legacy_graph_json TEXT",
        "ALTER TABLE journeys ADD COLUMN IF NOT EXISTS migration_error TEXT",
        "ALTER TABLE journeys ADD COLUMN IF NOT EXISTS migration_issues JSONB",
        "ALTER TABLE journeys ADD COLUMN IF NOT EXISTS last_checkpoint_at TIMESTAMPTZ",
    ):
        run(ddl)
    if has_column("journeys", "graph_json"):
        run(
            "UPDATE journeys SET legacy_graph_json = graph_json, schema_version = 3, draft_doc = '{}'::jsonb, "
            "draft_hash = repeat('0', 64) WHERE schema_version IS NULL"
        )
    run("UPDATE journeys SET draft_doc = '{}'::jsonb WHERE draft_doc IS NULL")
    run("UPDATE journeys SET draft_hash = repeat('0', 64) WHERE draft_hash IS NULL")
    run("UPDATE journeys SET schema_version = 3 WHERE schema_version IS NULL")
    run("CREATE UNIQUE INDEX IF NOT EXISTS uq_journeys_campaign_id ON journeys (campaign_id)")
    run(
        "CREATE TABLE IF NOT EXISTS journey_versions (id TEXT PRIMARY KEY, journey_id TEXT NOT NULL REFERENCES journeys(id) "
        "ON DELETE CASCADE, version_no INTEGER NOT NULL, doc JSONB NOT NULL, doc_hash CHAR(64) NOT NULL, "
        "schema_version INTEGER NOT NULL, notes VARCHAR(200), migration_issues JSONB, published_at TIMESTAMPTZ NOT NULL "
        "DEFAULT now(), CONSTRAINT uq_journey_versions_journey_id_version_no UNIQUE (journey_id, version_no))"
    )
    run(
        "CREATE TABLE IF NOT EXISTS journey_draft_checkpoints (id TEXT PRIMARY KEY, journey_id TEXT NOT NULL REFERENCES "
        "journeys(id) ON DELETE CASCADE, revision INTEGER NOT NULL, doc JSONB NOT NULL, reason VARCHAR(32) NOT NULL, "
        "created_at TIMESTAMPTZ NOT NULL DEFAULT now())"
    )
    run(
        "CREATE TABLE IF NOT EXISTS journey_sessions (id UUID PRIMARY KEY, campaign_id TEXT NOT NULL REFERENCES campaigns(id) "
        "ON DELETE CASCADE, version_id TEXT REFERENCES journey_versions(id) ON DELETE SET NULL, draft_revision INTEGER, "
        "is_test BOOLEAN NOT NULL DEFAULT false, device VARCHAR(8), utm JSONB NOT NULL DEFAULT '{}'::jsonb, referrer "
        "VARCHAR(2048), answers JSONB NOT NULL DEFAULT '{}'::jsonb, started_at TIMESTAMPTZ NOT NULL DEFAULT now(), "
        "last_event_at TIMESTAMPTZ NOT NULL DEFAULT now(), completed_at TIMESTAMPTZ, end_step_id TEXT)"
    )
    run(
        "CREATE TABLE IF NOT EXISTS journey_events (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, session_id UUID NOT "
        "NULL REFERENCES journey_sessions(id) ON DELETE CASCADE, campaign_id TEXT NOT NULL, version_id TEXT, seq INTEGER "
        "NOT NULL, type VARCHAR(24) NOT NULL, step_id TEXT, element_id TEXT, port TEXT, payload JSONB NOT NULL DEFAULT "
        "'{}'::jsonb, is_test BOOLEAN NOT NULL DEFAULT false, client_ts TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL "
        "DEFAULT now(), CONSTRAINT uq_journey_events_session_id_seq UNIQUE (session_id, seq))"
    )
    run(
        "CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE "
        "CASCADE, session_id UUID REFERENCES journey_sessions(id) ON DELETE SET NULL, version_id TEXT, element_id TEXT NOT "
        "NULL, data JSONB NOT NULL, normalized_email VARCHAR(254), normalized_phone VARCHAR(32), is_test BOOLEAN NOT NULL "
        "DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now())"
    )
    run(
        "CREATE TABLE IF NOT EXISTS webhook_deliveries (id UUID PRIMARY KEY, lead_id TEXT NOT NULL REFERENCES leads(id) ON "
        "DELETE CASCADE, attempt INTEGER NOT NULL, status_code INTEGER, error VARCHAR(300), delivered_at TIMESTAMPTZ, "
        "created_at TIMESTAMPTZ NOT NULL DEFAULT now())"
    )
    run(
        "CREATE TABLE IF NOT EXISTS ai_generation_jobs (id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL REFERENCES campaigns(id) "
        "ON DELETE CASCADE, status VARCHAR(12) NOT NULL, stage VARCHAR(12) NOT NULL, brief JSONB NOT NULL, outline JSONB, "
        "spec JSONB, issues JSONB, fallback_screens JSONB NOT NULL DEFAULT '[]'::jsonb, screens_done INTEGER NOT NULL "
        "DEFAULT 0, cancel_requested BOOLEAN NOT NULL DEFAULT false, error VARCHAR(300), created_at TIMESTAMPTZ NOT NULL "
        "DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())"
    )
    run(
        "CREATE TABLE IF NOT EXISTS files (key VARCHAR(120) PRIMARY KEY, mime VARCHAR(40) NOT NULL, width INTEGER, height "
        "INTEGER, bytes BYTEA NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())"
    )
    run(
        "CREATE TABLE IF NOT EXISTS user_templates (id TEXT PRIMARY KEY, name VARCHAR(60) NOT NULL, goal VARCHAR(32), doc "
        "JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())"
    )


def downgrade() -> None:
    raise NotImplementedError
