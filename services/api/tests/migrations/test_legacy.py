import pathlib

import psycopg
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core import db
from app.modules.journeys import backfill
from app.modules.journeys.domain.schema.doc import JourneyDoc
from tests.conftest import migrate, recreate, url_for

DUMP = pathlib.Path(__file__).resolve().parents[1] / "fixtures" / "legacy_c3ba7ac.sql"


async def test_legacy_dump_upgrades_and_backfills(worker_id):
    name = f"journeo_legacy_{worker_id}"
    recreate(name)
    url = url_for(name)
    with psycopg.connect(url, autocommit=True) as conn:
        conn.execute(DUMP.read_text())
    migrate(url)
    migrate(url)
    engine = db.make_engine(url)
    previous = db.sessions
    db.bind(async_sessionmaker(engine, expire_on_commit=False))
    try:
        converted = await backfill.run()
        assert converted == 3
        assert await backfill.run() == 0
        async with engine.connect() as conn:
            rows = (
                await conn.execute(
                    text(
                        "SELECT j.campaign_id, j.schema_version, j.draft_doc, v.version_no, v.doc, v.notes "
                        "FROM journeys j JOIN journey_versions v ON v.id = j.live_version_id ORDER BY j.campaign_id"
                    )
                )
            ).all()
            assert [r.campaign_id for r in rows] == [
                "apple-iphone-16-pro",
                "nike-air-zoom-pegasus-41",
                "tesla-model-y-2026",
            ]
            for row in rows:
                assert row.schema_version == 4
                assert row.version_no == 1
                assert row.notes == "Migrated"
                JourneyDoc.model_validate(row.doc)
                JourneyDoc.model_validate(row.draft_doc)
            orphans = (await conn.execute(text("SELECT id FROM legacy_orphan_journeys ORDER BY id"))).scalars().all()
            assert orphans == ["dupe-journey-1", "orphan-journey-1"]
            sources = (
                await conn.execute(text("SELECT kind, campaign_id, status FROM knowledge_sources ORDER BY id"))
            ).all()
            assert sources[0].kind == "qa"
            assert sources[0].campaign_id == "apple-iphone-16-pro"
            hits = (
                await conn.execute(
                    text(
                        "SELECT count(*) FROM document_chunks "
                        "WHERE tsv @@ websearch_to_tsquery('english', 'iphone dollars')"
                    )
                )
            ).scalar_one()
            assert hits == 1
            legacy = (await conn.execute(text("SELECT to_regclass('public.run_sessions') IS NULL"))).scalar_one()
            assert legacy
    finally:
        db.bind(previous)
        await engine.dispose()
