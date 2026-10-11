import argparse
import asyncio

from sqlalchemy import func, select

from app.core import db
from app.core.config import get_settings
from app.core.logging import log_event, setup_logging
from app.modules.campaigns import service as campaigns
from app.modules.campaigns.models import Campaign
from app.modules.campaigns.schemas import CreateBody, Goal, Start
from app.modules.journeys import library
from app.modules.journeys import service as journeys

DEMOS: tuple[tuple[str, Goal, str, str], ...] = (
    (
        "Summer launch waitlist",
        "leads",
        "lead-gen-launch",
        "Join the waitlist for our summer collection and get early access.",
    ),
    (
        "Find your perfect plan",
        "recommend",
        "product-quiz",
        "Answer two quick questions and we recommend the right plan.",
    ),
)


async def seed_demo() -> int:
    library.ensure_loaded(get_settings())
    async with db.session_scope() as session:
        existing = (await session.execute(select(func.count()).select_from(Campaign))).scalar_one()
        if existing:
            return 0
        created = 0
        for name, goal, template_id, brief in DEMOS:
            if library.template(template_id) is None:
                continue
            body = CreateBody(name=name, goal=goal, brief=brief, start=Start(mode="template", template_id=template_id))
            campaign, _, _ = await campaigns.create(session, body)
            _, revision, _ = await journeys.get_draft(session, campaign.id)
            await journeys.publish(session, campaign.id, revision, "Demo")
            created += 1
        log_event("demo seeded", event="seed", campaigns=created)
        return created


async def main_async() -> None:
    settings = get_settings()
    setup_logging(settings.log_level)
    await db.connect(settings)
    try:
        await seed_demo()
    finally:
        await db.dispose()


def main() -> None:
    argparse.ArgumentParser().parse_args()
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
