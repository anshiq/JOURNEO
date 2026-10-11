from sqlalchemy import text

from app.core import db
from app.core.tasks import task_app


@task_app.periodic(cron="17 * * * *")
@task_app.task(name="journeys.prune_checkpoints", queue="default")
async def prune_checkpoints(timestamp: int) -> None:
    async with db.session_scope() as session:
        await session.execute(
            text(
                "DELETE FROM journey_draft_checkpoints c USING (SELECT id, row_number() OVER "
                "(PARTITION BY journey_id ORDER BY created_at DESC) AS rn FROM journey_draft_checkpoints) r "
                "WHERE c.id = r.id AND r.rn > 50"
            )
        )
