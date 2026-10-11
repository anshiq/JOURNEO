import uuid
from typing import Any

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.journeys.models import Journey, JourneyCheckpoint, JourneyVersion, UserTemplate


def new_id() -> str:
    return str(uuid.uuid4())


async def get_by_campaign(session: AsyncSession, campaign_id: str, *, lock: bool = False) -> Journey | None:
    stmt = select(Journey).where(Journey.campaign_id == campaign_id)
    if lock:
        stmt = stmt.with_for_update()
    return (await session.execute(stmt)).scalar_one_or_none()


async def create(session: AsyncSession, campaign_id: str, doc: dict[str, Any], doc_hash: str) -> Journey:
    journey = Journey(
        id=new_id(),
        campaign_id=campaign_id,
        draft_doc=doc,
        draft_revision=1,
        draft_hash=doc_hash,
        schema_version=4,
    )
    session.add(journey)
    await session.flush()
    return journey


async def conditional_update(
    session: AsyncSession, journey_id: str, base_revision: int, doc: dict[str, Any], doc_hash: str
) -> int | None:
    stmt = (
        update(Journey)
        .where(Journey.id == journey_id, Journey.draft_revision == base_revision)
        .values(
            draft_doc=doc,
            draft_hash=doc_hash,
            draft_revision=Journey.draft_revision + 1,
            schema_version=4,
            updated_at=func.now(),
        )
        .returning(Journey.draft_revision)
        .execution_options(synchronize_session=False)
    )
    row = (await session.execute(stmt)).first()
    return int(row[0]) if row else None


async def force_update(session: AsyncSession, journey: Journey, doc: dict[str, Any], doc_hash: str) -> int:
    journey.draft_doc = doc
    journey.draft_hash = doc_hash
    journey.draft_revision = journey.draft_revision + 1
    journey.schema_version = 4
    journey.updated_at = func.now()
    await session.flush()
    await session.refresh(journey)
    return journey.draft_revision


async def next_version_no(session: AsyncSession, journey_id: str) -> int:
    result = await session.execute(
        select(func.coalesce(func.max(JourneyVersion.version_no), 0)).where(JourneyVersion.journey_id == journey_id)
    )
    return int(result.scalar_one()) + 1


async def insert_version(
    session: AsyncSession,
    journey_id: str,
    version_no: int,
    doc: dict[str, Any],
    doc_hash: str,
    notes: str | None = None,
    migration_issues: list[Any] | None = None,
) -> JourneyVersion:
    version = JourneyVersion(
        id=new_id(),
        journey_id=journey_id,
        version_no=version_no,
        doc=doc,
        doc_hash=doc_hash,
        schema_version=4,
        notes=notes,
        migration_issues=migration_issues,
    )
    session.add(version)
    await session.flush()
    return version


async def get_version(session: AsyncSession, journey_id: str, version_no: int) -> JourneyVersion | None:
    stmt = select(JourneyVersion).where(
        JourneyVersion.journey_id == journey_id, JourneyVersion.version_no == version_no
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def get_version_by_id(session: AsyncSession, version_id: str) -> JourneyVersion | None:
    return await session.get(JourneyVersion, version_id)


async def list_versions(session: AsyncSession, journey_id: str) -> list[JourneyVersion]:
    stmt = (
        select(JourneyVersion).where(JourneyVersion.journey_id == journey_id).order_by(JourneyVersion.version_no.desc())
    )
    return list((await session.execute(stmt)).scalars().all())


async def insert_checkpoint(
    session: AsyncSession, journey_id: str, revision: int, doc: dict[str, Any], reason: str
) -> JourneyCheckpoint:
    checkpoint = JourneyCheckpoint(id=new_id(), journey_id=journey_id, revision=revision, doc=doc, reason=reason[:32])
    session.add(checkpoint)
    await session.flush()
    return checkpoint


async def prune_checkpoints(session: AsyncSession, journey_id: str, keep: int = 50) -> None:
    keep_ids = (
        select(JourneyCheckpoint.id)
        .where(JourneyCheckpoint.journey_id == journey_id)
        .order_by(JourneyCheckpoint.created_at.desc(), JourneyCheckpoint.id.desc())
        .limit(keep)
    )
    await session.execute(
        delete(JourneyCheckpoint)
        .where(JourneyCheckpoint.journey_id == journey_id, JourneyCheckpoint.id.not_in(keep_ids))
        .execution_options(synchronize_session=False)
    )


async def list_checkpoints(session: AsyncSession, journey_id: str, limit: int = 50) -> list[JourneyCheckpoint]:
    stmt = (
        select(JourneyCheckpoint)
        .where(JourneyCheckpoint.journey_id == journey_id)
        .order_by(JourneyCheckpoint.created_at.desc(), JourneyCheckpoint.id.desc())
        .limit(limit)
    )
    return list((await session.execute(stmt)).scalars().all())


async def get_checkpoint(session: AsyncSession, journey_id: str, checkpoint_id: str) -> JourneyCheckpoint | None:
    stmt = select(JourneyCheckpoint).where(
        JourneyCheckpoint.journey_id == journey_id, JourneyCheckpoint.id == checkpoint_id
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def legacy_rows(session: AsyncSession, batch: int = 50, after: str = "") -> list[Journey]:
    stmt = select(Journey).where(Journey.schema_version < 4, Journey.id > after).order_by(Journey.id).limit(batch)
    return list((await session.execute(stmt)).scalars().all())


async def legacy_status(session: AsyncSession, journey_id: str) -> str | None:
    from sqlalchemy import text

    has_column = (
        await session.execute(
            text("SELECT 1 FROM information_schema.columns WHERE table_name = 'journeys' AND column_name = 'status'")
        )
    ).first()
    if not has_column:
        return None
    row = (await session.execute(text("SELECT status FROM journeys WHERE id = :id"), {"id": journey_id})).first()
    return str(row[0]) if row and row[0] is not None else None


async def insert_template(session: AsyncSession, name: str, goal: str | None, doc: dict[str, Any]) -> UserTemplate:
    template = UserTemplate(id=new_id(), name=name, goal=goal, doc=doc)
    session.add(template)
    await session.flush()
    return template


async def list_templates(session: AsyncSession) -> list[UserTemplate]:
    stmt = select(UserTemplate).order_by(UserTemplate.created_at.desc())
    return list((await session.execute(stmt)).scalars().all())


async def get_template(session: AsyncSession, template_id: str) -> UserTemplate | None:
    return await session.get(UserTemplate, template_id)


async def statuses(
    session: AsyncSession, campaign_ids: list[str]
) -> list[tuple[str, bool, Any, str, str | None, int | None]]:
    if not campaign_ids:
        return []
    stmt = (
        select(
            Journey.campaign_id,
            Journey.paused,
            Journey.ends_at,
            Journey.draft_hash,
            JourneyVersion.doc_hash,
            JourneyVersion.version_no,
        )
        .outerjoin(JourneyVersion, JourneyVersion.id == Journey.live_version_id)
        .where(Journey.campaign_id.in_(campaign_ids))
    )
    return [(row[0], row[1], row[2], row[3], row[4], row[5]) for row in (await session.execute(stmt)).all()]
