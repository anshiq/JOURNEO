import asyncio

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.modules.campaigns import service as campaigns
from app.modules.campaigns.models import Campaign
from app.modules.campaigns.schemas import CreateBody
from app.modules.journeys import library
from app.modules.journeys import service as journeys


async def test_concurrent_publishes_get_distinct_versions(engine, settings):
    library.load(settings)
    makers = async_sessionmaker(engine, expire_on_commit=False)
    async with makers() as s, s.begin():
        campaign, _, _ = await campaigns.create(s, CreateBody(name="Race"))
        campaign_id = campaign.id
    try:
        async with makers() as s:
            _, revision, _ = await journeys.get_draft(s, campaign_id)

        async def publish_once() -> int:
            session: AsyncSession
            async with makers() as session, session.begin():
                result = await journeys.publish(session, campaign_id, revision)
                await asyncio.sleep(0.05)
                return result.version_no

        numbers = await asyncio.gather(publish_once(), publish_once())
        assert sorted(numbers) == [1, 2]
    finally:
        async with makers() as s, s.begin():
            await s.execute(delete(Campaign).where(Campaign.id == campaign_id))
