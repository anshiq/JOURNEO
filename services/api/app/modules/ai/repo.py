import uuid
from datetime import timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.ai.models import AiGenerationJob, utcnow

ACTIVE_WINDOW_MINUTES = 15


async def insert(session: AsyncSession, campaign_id: str, brief: dict[str, Any]) -> AiGenerationJob:
    job = AiGenerationJob(
        id=f"job_{uuid.uuid4().hex[:16]}",
        campaign_id=campaign_id,
        status="queued",
        stage="outline",
        brief=brief,
        fallback_screens=[],
        screens_done=0,
        cancel_requested=False,
    )
    session.add(job)
    await session.flush()
    return job


async def get(session: AsyncSession, campaign_id: str, job_id: str) -> AiGenerationJob | None:
    job = await session.get(AiGenerationJob, job_id)
    return job if job is not None and job.campaign_id == campaign_id else None


async def by_id(session: AsyncSession, job_id: str) -> AiGenerationJob | None:
    return await session.get(AiGenerationJob, job_id, populate_existing=True)


async def active_for(session: AsyncSession, campaign_id: str) -> AiGenerationJob | None:
    cutoff = utcnow() - timedelta(minutes=ACTIVE_WINDOW_MINUTES)
    result = await session.execute(
        select(AiGenerationJob)
        .where(
            AiGenerationJob.campaign_id == campaign_id,
            AiGenerationJob.status.in_(("queued", "running")),
            AiGenerationJob.created_at >= cutoff,
        )
        .order_by(AiGenerationJob.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def update(session: AsyncSession, job: AiGenerationJob, **values: Any) -> None:
    for key, value in values.items():
        setattr(job, key, value)
    job.updated_at = utcnow()
    await session.flush()
