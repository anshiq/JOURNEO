import datetime
import secrets
import uuid
from typing import Any

from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.campaigns.models import Campaign, CampaignSlug


async def get(session: AsyncSession, campaign_id: str, *, include_deleted: bool = False) -> Campaign | None:
    stmt = select(Campaign).where(Campaign.id == campaign_id)
    if not include_deleted:
        stmt = stmt.where(Campaign.deleted_at.is_(None))
    return (await session.execute(stmt)).scalar_one_or_none()


async def list_active(
    session: AsyncSession, limit: int, cursor: tuple[datetime.datetime, str] | None
) -> list[Campaign]:
    stmt = select(Campaign).where(Campaign.deleted_at.is_(None))
    if cursor:
        stamp, last_id = cursor
        stmt = stmt.where(or_(Campaign.updated_at < stamp, and_(Campaign.updated_at == stamp, Campaign.id < last_id)))
    stmt = stmt.order_by(Campaign.updated_at.desc(), Campaign.id.desc()).limit(limit)
    return list((await session.execute(stmt)).scalars().all())


async def slug_owner(session: AsyncSession, slug: str) -> str | None:
    current = (await session.execute(select(Campaign.id).where(Campaign.slug == slug))).scalar_one_or_none()
    if current:
        return current
    return (
        await session.execute(select(CampaignSlug.campaign_id).where(CampaignSlug.slug == slug))
    ).scalar_one_or_none()


async def by_slug_or_id(session: AsyncSession, value: str) -> tuple[Campaign | None, bool]:
    stmt = select(Campaign).where(or_(Campaign.slug == value, Campaign.id == value))
    found = (await session.execute(stmt)).scalars().first()
    if found is not None:
        return found, False
    history = (
        select(Campaign).join(CampaignSlug, CampaignSlug.campaign_id == Campaign.id).where(CampaignSlug.slug == value)
    )
    found = (await session.execute(history)).scalar_one_or_none()
    return found, found is not None


async def by_dev_token(session: AsyncSession, token: str) -> Campaign | None:
    stmt = select(Campaign).where(Campaign.dev_token == token, Campaign.deleted_at.is_(None))
    return (await session.execute(stmt)).scalar_one_or_none()


async def insert(session: AsyncSession, values: dict[str, Any]) -> Campaign:
    campaign = Campaign(
        id=str(uuid.uuid4()),
        dev_token=secrets.token_urlsafe(24),
        webhook_secret=secrets.token_hex(24),
        **values,
    )
    session.add(campaign)
    await session.flush()
    return campaign


async def remember_slug(session: AsyncSession, slug: str, campaign_id: str) -> None:
    existing = await session.get(CampaignSlug, slug)
    if existing is None:
        session.add(CampaignSlug(slug=slug, campaign_id=campaign_id))
    else:
        existing.campaign_id = campaign_id
    await session.flush()


async def forget_slug(session: AsyncSession, slug: str) -> None:
    existing = await session.get(CampaignSlug, slug)
    if existing is not None:
        await session.delete(existing)
        await session.flush()


async def touch(session: AsyncSession, campaign_id: str) -> None:
    await session.execute(
        update(Campaign)
        .where(Campaign.id == campaign_id)
        .values(updated_at=func.now())
        .execution_options(synchronize_session=False)
    )
