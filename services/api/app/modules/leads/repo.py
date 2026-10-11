import datetime
import uuid
from typing import Any

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.leads.models import Lead, WebhookDelivery


async def insert(session: AsyncSession, values: dict[str, Any]) -> Lead:
    lead = Lead(id=str(uuid.uuid4()), **values)
    session.add(lead)
    await session.flush()
    return lead


async def get(session: AsyncSession, lead_id: str) -> Lead | None:
    return await session.get(Lead, lead_id)


async def exists_contact(
    session: AsyncSession, campaign_id: str, email: str | None, phone: str | None, include_test: bool
) -> set[str]:
    found: set[str] = set()
    for kind, column, value in (("email", Lead.normalized_email, email), ("phone", Lead.normalized_phone, phone)):
        if not value:
            continue
        stmt = select(Lead.id).where(Lead.campaign_id == campaign_id, column == value).limit(1)
        if not include_test:
            stmt = stmt.where(Lead.is_test.is_(False))
        if (await session.execute(stmt)).first():
            found.add(kind)
    return found


async def page(
    session: AsyncSession,
    campaign_id: str,
    limit: int,
    cursor: tuple[datetime.datetime, str] | None,
    include_test: bool,
) -> list[Lead]:
    stmt = select(Lead).where(Lead.campaign_id == campaign_id)
    if not include_test:
        stmt = stmt.where(Lead.is_test.is_(False))
    if cursor:
        stamp, last_id = cursor
        stmt = stmt.where(or_(Lead.created_at < stamp, and_(Lead.created_at == stamp, Lead.id < last_id)))
    stmt = stmt.order_by(Lead.created_at.desc(), Lead.id.desc()).limit(limit)
    return list((await session.execute(stmt)).scalars().all())


async def record_delivery(
    session: AsyncSession, lead_id: str, attempt: int, status_code: int | None, error: str | None, delivered: bool
) -> None:
    session.add(
        WebhookDelivery(
            id=uuid.uuid4(),
            lead_id=lead_id,
            attempt=attempt,
            status_code=status_code,
            error=(error or None) and error[:300],
            delivered_at=datetime.datetime.now(datetime.UTC) if delivered else None,
        )
    )
    await session.flush()


async def last_delivery(session: AsyncSession, campaign_id: str) -> WebhookDelivery | None:
    stmt = (
        select(WebhookDelivery)
        .join(Lead, Lead.id == WebhookDelivery.lead_id)
        .where(Lead.campaign_id == campaign_id)
        .order_by(WebhookDelivery.created_at.desc())
        .limit(1)
    )
    return (await session.execute(stmt)).scalar_one_or_none()
