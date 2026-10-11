import datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def counts(session: AsyncSession, campaign_ids: list[str]) -> dict[str, dict[str, int]]:
    if not campaign_ids:
        return {}
    rows = await session.execute(
        text(
            "SELECT c.id, "
            "(SELECT count(*) FROM journey_sessions s WHERE s.campaign_id = c.id AND NOT s.is_test) AS views, "
            "(SELECT count(*) FROM journey_sessions s WHERE s.campaign_id = c.id AND NOT s.is_test "
            "AND s.completed_at IS NOT NULL) AS completed, "
            "(SELECT count(*) FROM leads l WHERE l.campaign_id = c.id AND NOT l.is_test) AS leads "
            "FROM campaigns c WHERE c.id = ANY(:ids)"
        ),
        {"ids": campaign_ids},
    )
    return {r.id: {"views": int(r.views), "completed": int(r.completed), "leads": int(r.leads)} for r in rows}


async def funnel(
    session: AsyncSession, campaign_id: str, since: datetime.datetime | None
) -> list[tuple[str, int, int]]:
    rows = await session.execute(
        text(
            "SELECT step_id, count(DISTINCT session_id) FILTER (WHERE type = 'screen_view') AS visitors, "
            "count(DISTINCT session_id) FILTER (WHERE type = 'exit') AS exits "
            "FROM journey_events WHERE campaign_id = :cid AND NOT is_test AND step_id IS NOT NULL "
            "AND (CAST(:since AS timestamptz) IS NULL OR created_at >= :since) GROUP BY step_id"
        ),
        {"cid": campaign_id, "since": since},
    )
    return [(r.step_id, int(r.visitors), int(r.exits)) for r in rows]


async def session_stats(session: AsyncSession, campaign_id: str, since: datetime.datetime | None) -> dict[str, Any]:
    params = {"cid": campaign_id, "since": since}
    where = "campaign_id = :cid AND NOT is_test AND (CAST(:since AS timestamptz) IS NULL OR started_at >= :since)"
    totals = (
        await session.execute(
            text(
                f"SELECT count(*) AS sessions, count(completed_at) AS completed, "
                "count(*) FILTER (WHERE completed_at IS NULL AND last_event_at < now() - interval '30 minutes') "
                "AS abandoned "
                f"FROM journey_sessions WHERE {where}"
            ),
            params,
        )
    ).one()
    devices = await session.execute(
        text(
            "SELECT coalesce(device, 'unknown') AS device, count(*) AS n "
            f"FROM journey_sessions WHERE {where} GROUP BY 1"
        ),
        params,
    )
    scoped = (
        "s.campaign_id = :cid AND NOT s.is_test AND (CAST(:since AS timestamptz) IS NULL OR s.started_at >= :since)"
    )
    answers = await session.execute(
        text(
            f"SELECT a.key, a.value, count(*) AS n FROM journey_sessions s, jsonb_each(s.answers) a "
            f"WHERE {scoped} "
            "AND jsonb_typeof(a.value) IN ('string', 'number', 'array') GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 500"
        ),
        params,
    )
    return {
        "sessions": int(totals.sessions),
        "completed": int(totals.completed),
        "abandoned": int(totals.abandoned),
        "devices": {r.device: int(r.n) for r in devices},
        "answers": [(r.key, r.value, int(r.n)) for r in answers],
    }
