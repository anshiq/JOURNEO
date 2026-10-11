import argparse
import asyncio
import json
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core import db
from app.core.canonical import doc_hash
from app.core.config import get_settings
from app.core.logging import log_event, setup_logging
from app.modules.journeys import repo, service
from app.modules.journeys.models import Journey
from app.modules.journeys.upgraders.v3_to_v4 import ensure_current


def legacy_source(journey: Journey) -> Any:
    draft = journey.draft_doc if isinstance(journey.draft_doc, dict) else {}
    if draft:
        return draft
    if journey.legacy_graph_json:
        try:
            return json.loads(journey.legacy_graph_json)
        except ValueError:
            return {}
    return {}


async def upgrade_row(session: AsyncSession, journey: Journey, dry_run: bool) -> dict[str, Any]:
    doc, issues = ensure_current(legacy_source(journey))
    status = await repo.legacy_status(session, journey.id)
    published = (status or "").upper() == "PUBLISHED"
    if not dry_run:
        journey.draft_doc = doc
        journey.draft_hash = doc_hash(doc)
        journey.schema_version = 4
        journey.migration_issues = [i.as_dict() for i in issues] or None
        journey.migration_error = None
        await session.flush()
        if published and journey.live_version_id is None:
            await service.publish_migrated(session, journey, doc, issues)
    return {"issues": len(issues), "codes": sorted({i.code for i in issues}), "published": published}


async def run(dry_run: bool = False) -> int:
    after = ""
    count = 0
    while True:
        async with db.session_scope() as session:
            rows = await repo.legacy_rows(session, after=after)
            if not rows:
                return count
            for journey in rows:
                after = journey.id
                campaign_id = journey.campaign_id
                try:
                    async with session.begin_nested():
                        report = await upgrade_row(session, journey, dry_run)
                    count += 1
                    log_event(
                        "journey backfilled",
                        event="backfill",
                        campaign_id=campaign_id,
                        issues=report["issues"],
                        codes=",".join(report["codes"]) or "none",
                        published=report["published"],
                        dry_run=dry_run,
                    )
                except Exception as exc:
                    journey.migration_error = f"{type(exc).__name__}: {exc}"[:500]
                    log_event(
                        "journey backfill failed",
                        event="backfill",
                        campaign_id=journey.campaign_id,
                        err=type(exc).__name__,
                    )
            if dry_run:
                await session.rollback()


async def main_async(dry_run: bool) -> None:
    settings = get_settings()
    setup_logging(settings.log_level)
    await db.connect(settings)
    try:
        total = await run(dry_run)
        log_event("backfill finished", event="backfill_done", rows=total, dry_run=dry_run)
    finally:
        await db.dispose()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    asyncio.run(main_async(args.dry_run))


if __name__ == "__main__":
    main()
