from alembic import op

revision = "0006_drop_legacy"
down_revision = "0005_reconcile"
branch_labels = None
depends_on = None

LEGACY_TABLES = (
    "run_activity_events",
    "run_screen_executions",
    "run_sessions",
    "activity_events",
    "field_values",
    "request_logs",
    "click_events",
    "llm_usage_events",
    "delivery_events",
    "metric_definitions",
    "mock_campaigns",
    "audit_log",
    "audit_log_entries",
    "action_proposals",
    "anomaly_events",
    "eval_runs",
    "document_embeddings",
)


def upgrade() -> None:
    run = op.get_bind().exec_driver_sql
    for table in LEGACY_TABLES:
        run(f"DROP TABLE IF EXISTS {table} CASCADE")


def downgrade() -> None:
    raise NotImplementedError
