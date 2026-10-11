from alembic import op


def raw_execute(sql: str) -> None:
    cursor = op.get_bind().connection.dbapi_connection.cursor()
    try:
        cursor.execute(sql)
    finally:
        cursor.close()


revision = "0003_tasks"
down_revision = "0002_journey_v4"
branch_labels = None
depends_on = None


def install_procrastinate() -> None:
    from procrastinate.schema import SchemaManager

    run = op.get_bind().exec_driver_sql
    installed = run("SELECT to_regproc('procrastinate_fetch_job_v2') IS NOT NULL").scalar()
    if installed:
        return
    run("DROP TABLE IF EXISTS procrastinate_jobs CASCADE")
    raw_execute(SchemaManager.get_schema())


def upgrade() -> None:
    install_procrastinate()


def downgrade() -> None:
    raise NotImplementedError
