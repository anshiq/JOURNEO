import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.journeys import service as journeys
from app.modules.journeys.domain.analysis import build_index
from app.modules.journeys.domain.ports import screen_outputs
from app.modules.journeys.domain.schema.doc import JourneyDoc
from app.modules.journeys.domain.summary import step_name
from app.modules.results import queries

RANGES = {"7d": datetime.timedelta(days=7), "30d": datetime.timedelta(days=30)}


async def counts(session: AsyncSession, campaign_ids: list[str]) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for cid, values in (await queries.counts(session, campaign_ids)).items():
        views = values["views"]
        out[cid] = {**values, "conversion": round(values["leads"] / views, 4) if views else 0.0}
    return out


async def summary(session: AsyncSession, campaign_id: str, range_key: str) -> dict[str, Any]:
    since = datetime.datetime.now(datetime.UTC) - RANGES[range_key] if range_key in RANGES else None
    live = await journeys.live_doc(session, campaign_id)
    raw = live.doc if live else (await journeys.get_draft(session, campaign_id))[0]
    doc = JourneyDoc.model_validate(raw)
    index = build_index(doc)
    funnel_rows = {
        step: (visitors, exits) for step, visitors, exits in await queries.funnel(session, campaign_id, since)
    }
    ordered = sorted((s for s in doc.steps if s.kind == "screen"), key=lambda s: index.order.get(s.id, 10**9))
    funnel = [
        {
            "stepId": s.id,
            "label": step_name(doc, s.id),
            "visitors": funnel_rows.get(s.id, (0, 0))[0],
            "exits": funnel_rows.get(s.id, (0, 0))[1],
        }
        for s in ordered
    ]
    stats = await queries.session_stats(session, campaign_id, since)
    labels: dict[str, dict[str, Any]] = {}
    for screen in doc.screens.values():
        for out in screen_outputs(screen):
            if out.type in ("choice", "choices", "rating"):
                labels[out.key] = {"label": out.label, "type": out.type, "options": dict(out.options)}
    answers: dict[str, dict[str, Any]] = {}
    for key, value, n in stats["answers"]:
        meta = labels.get(key)
        if meta is None:
            continue
        bucket = answers.setdefault(key, {"label": meta["label"], "type": meta["type"], "values": {}})
        for item in value if isinstance(value, list) else [value]:
            name = meta["options"].get(item, str(item))
            bucket["values"][name] = bucket["values"].get(name, 0) + n
    sessions = stats["sessions"]
    return {
        "range": range_key,
        "sessions": sessions,
        "completed": stats["completed"],
        "abandoned": stats["abandoned"],
        "completion": round(stats["completed"] / sessions, 4) if sessions else 0.0,
        "devices": stats["devices"],
        "funnel": funnel,
        "answers": answers,
    }
