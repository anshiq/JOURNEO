from sqlalchemy import text

from app.core import db
from app.core.tasks import task_app


@task_app.periodic(cron="0 3 * * *")
@task_app.task(name="runtime.purge_test_data", queue="default")
async def purge_test_data(timestamp: int) -> None:
    async with db.session_scope() as session:
        await session.execute(text("DELETE FROM leads WHERE is_test AND created_at < now() - interval '7 days'"))
        await session.execute(
            text("DELETE FROM journey_sessions WHERE is_test AND started_at < now() - interval '7 days'")
        )
