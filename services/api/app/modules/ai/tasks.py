from procrastinate import RetryStrategy

from app.core.config import get_settings
from app.core.tasks import task_app


@task_app.task(name="ai.generate_journey", queue="ai", retry=RetryStrategy(max_attempts=5, wait=2))
async def generate_journey(job_id: str) -> None:
    from app.modules.ai import service

    await service.run_generation(job_id, get_settings())
