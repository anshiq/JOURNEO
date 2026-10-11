from procrastinate import RetryStrategy

from app.core import db
from app.core.tasks import task_app


class SourceNotReady(Exception):
    pass


@task_app.task(name="assistant.ingest_source", queue="ingest", retry=RetryStrategy(max_attempts=3, wait=10))
async def ingest_source(source_id: str) -> None:
    from app.modules.assistant import ingest, repo

    async with db.session_scope() as session:
        source = await repo.source_by_id(session, source_id)
        if source is None:
            raise SourceNotReady(source_id)
        await ingest.ingest(session, source)
