import datetime
import uuid
from dataclasses import dataclass
from typing import Any

import orjson
from pydantic import ValidationError
from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import Conflict, NotFound, ValidationFailed
from app.core.logging import log_event
from app.modules.campaigns import service as campaigns
from app.modules.journeys import service as journeys
from app.modules.journeys.schemas import LiveDoc
from app.modules.leads import service as leads
from app.modules.runtime import doc_cache
from app.modules.runtime.models import JourneyEvent, JourneySession
from app.modules.runtime.schemas import EventIn, SessionBody, SubmitBody
from app.modules.runtime.submit import FormNotFound, validate_submission


def utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.UTC)


@dataclass(slots=True)
class PublicView:
    campaign_id: str
    name: str
    slug: str
    redirect_to: str | None
    live: LiveDoc | None
    over: bool

    def payload(self) -> dict[str, Any]:
        campaign = {"id": self.campaign_id, "name": self.name, "slug": self.slug}
        if self.live is None:
            return {"mode": "live", "campaign": campaign, "versionId": None, "doc": None, "ended": {"kind": "message"}}
        if self.over:
            return {"mode": "live", "campaign": campaign, "versionId": None, "doc": None, "ended": self.live.ended}
        return {
            "mode": "live",
            "campaign": campaign,
            "versionId": self.live.version_id,
            "doc": self.live.doc,
            "ended": None,
        }


journeys.on_live_change(doc_cache.invalidate)


async def cached_live(session: AsyncSession, campaign_id: str) -> LiveDoc | None:
    cached = doc_cache.get_live(campaign_id)
    if cached is not doc_cache.MISSING:
        return cached
    live = await journeys.live_doc(session, campaign_id)
    doc_cache.set_live(campaign_id, live)
    if live is not None:
        doc_cache.set_version(live.version_id, (campaign_id, live.doc))
    return live


async def resolve(session: AsyncSession, slug: str) -> PublicView:
    campaign, from_history = await campaigns.resolve_public(session, slug)
    if campaign is None:
        raise NotFound("This link does not exist")
    redirect = campaign.slug if from_history or (slug != campaign.slug and slug == campaign.id) else None
    if campaign.deleted_at is not None:
        return PublicView(campaign.id, campaign.name, campaign.slug, None, None, True)
    live = await cached_live(session, campaign.id)
    over = live is None or live.is_over(utcnow())
    return PublicView(campaign.id, campaign.name, campaign.slug, redirect, live, over)


async def dev_view(session: AsyncSession, token: str) -> dict[str, Any]:
    campaign = await campaigns.by_dev_token(session, token)
    if campaign is None:
        raise NotFound("This preview link is no longer valid")
    doc, revision, doc_hash = await journeys.get_draft(session, campaign.id)
    return {
        "mode": "test",
        "campaign": {"id": campaign.id, "name": campaign.name, "slug": campaign.slug},
        "doc": doc,
        "revision": revision,
        "hash": doc_hash,
        "versionId": None,
        "ended": None,
    }


async def pinned_doc(session: AsyncSession, row: JourneySession) -> dict[str, Any]:
    if row.is_test:
        doc, _, _ = await journeys.get_draft(session, row.campaign_id)
        return doc
    if row.version_id is None:
        raise NotFound("Session has no published version")
    cached = doc_cache.get_version(row.version_id)
    if cached is None:
        cached = await journeys.version_by_id(session, row.version_id)
        if cached is None:
            raise NotFound("Version not found")
        doc_cache.set_version(row.version_id, cached)
    return cached[1]


async def upsert_session(session: AsyncSession, body: SessionBody) -> dict[str, Any]:
    if not await campaigns.exists(session, body.campaign_id):
        raise NotFound("Campaign not found")
    is_test = False
    version_id: str | None = None
    draft_revision: int | None = None
    if body.dev_token:
        campaign = await campaigns.by_dev_token(session, body.dev_token)
        if campaign is None or campaign.id != body.campaign_id:
            raise NotFound("Preview link is not valid")
        is_test = True
        _, draft_revision, _ = await journeys.get_draft(session, campaign.id)
    else:
        live = await cached_live(session, body.campaign_id)
        if live is None:
            raise NotFound("Not published")
        version_id = live.version_id
        if body.version_id and body.version_id != live.version_id:
            found = await journeys.version_by_id(session, body.version_id)
            if found is not None and found[0] == body.campaign_id:
                version_id = body.version_id
    existing = await session.get(JourneySession, body.id)
    if existing is not None:
        if existing.campaign_id != body.campaign_id:
            raise Conflict("Session belongs to another campaign")
        existing.last_event_at = utcnow()
        await session.flush()
        return {"id": str(existing.id), "versionId": existing.version_id, "isTest": existing.is_test, "resumed": True}
    stmt = (
        insert(JourneySession)
        .values(
            id=body.id,
            campaign_id=body.campaign_id,
            version_id=version_id,
            draft_revision=draft_revision,
            is_test=is_test,
            device=body.device,
            utm=body.utm,
            referrer=body.referrer,
        )
        .on_conflict_do_nothing(index_elements=["id"])
    )
    await session.execute(stmt)
    return {"id": str(body.id), "versionId": version_id, "isTest": is_test, "resumed": False}


def parse_session_id(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as exc:
        raise NotFound("Session not found") from exc


async def load_session(session: AsyncSession, session_id: str, *, lock: bool = False) -> JourneySession:
    stmt = select(JourneySession).where(JourneySession.id == parse_session_id(session_id))
    if lock:
        stmt = stmt.with_for_update()
    row = (await session.execute(stmt)).scalar_one_or_none()
    if row is None:
        raise NotFound("Session not found")
    return row


def decode_events(raw: bytes) -> list[dict[str, Any]]:
    try:
        payload = orjson.loads(raw or b"{}")
    except orjson.JSONDecodeError as exc:
        raise ValidationFailed("Events must be JSON") from exc
    events = payload.get("events") if isinstance(payload, dict) else None
    if not isinstance(events, list):
        raise ValidationFailed("Events must be a list")
    return [e for e in events[:100] if isinstance(e, dict)]


async def ingest_events(session: AsyncSession, session_id: str, raw_events: list[dict[str, Any]]) -> int:
    row = await load_session(session, session_id)
    events: list[EventIn] = []
    for raw in raw_events:
        try:
            events.append(EventIn.model_validate(raw))
        except ValidationError:
            continue
    if not events:
        return 0
    rows = [
        {
            "session_id": row.id,
            "campaign_id": row.campaign_id,
            "version_id": row.version_id,
            "seq": e.seq,
            "type": e.type,
            "step_id": e.step,
            "element_id": e.element,
            "port": e.port,
            "payload": e.payload,
            "is_test": row.is_test,
            "client_ts": e.client_ts,
        }
        for e in events
    ]
    result = await session.execute(
        insert(JourneyEvent)
        .values(rows)
        .on_conflict_do_nothing(index_elements=["session_id", "seq"])
        .returning(JourneyEvent.seq)
    )
    accepted = {int(r[0]) for r in result.all()}
    values: dict[str, Any] = {"last_event_at": utcnow()}
    answers = dict(row.answers or {})
    for e in events:
        if e.seq not in accepted:
            continue
        if e.type == "answer" and isinstance(e.payload.get("key"), str):
            answers[str(e.payload["key"])[:40]] = e.payload.get("value")
        if e.type == "complete":
            values["completed_at"] = utcnow()
            values["end_step_id"] = e.step
    if answers != (row.answers or {}):
        values["answers"] = answers
    await session.execute(
        update(JourneySession)
        .where(JourneySession.id == row.id)
        .values(**values)
        .execution_options(synchronize_session=False)
    )
    return len(accepted)


async def submit(session: AsyncSession, session_id: str, body: SubmitBody) -> dict[str, Any]:
    row = await load_session(session, session_id, lock=True)
    if body.hp:
        log_event("honeypot submit ignored", event="honeypot", campaign_id=row.campaign_id)
        return {"ok": True}
    doc = await pinned_doc(session, row)
    try:
        result = validate_submission(doc, body.step_id, body.element_id, body.answers)
    except FormNotFound as exc:
        raise NotFound("Form not found") from exc
    if result.errors:
        raise ValidationFailed("Check the highlighted fields", fields=result.errors)
    taken = await leads.duplicates(session, row.campaign_id, result.unique, include_test=row.is_test)
    if taken:
        raise Conflict("You have already entered", fields=dict.fromkeys(taken, "You've already entered"))
    version_no = None
    if row.version_id:
        live = await cached_live(session, row.campaign_id)
        version_no = live.version_no if live and live.version_id == row.version_id else None
    lead_id = await leads.record_lead(
        session,
        campaign_id=row.campaign_id,
        session_id=row.id,
        version_id=row.version_id,
        element_id=body.element_id,
        answers=result.answers,
        labels=result.labels,
        consent={"text": result.consent_text, "checkedAt": utcnow().isoformat(), "versionNo": version_no}
        if result.consent_text
        else None,
        utm=row.utm or {},
        email=result.email,
        phone=result.phone,
        is_test=row.is_test,
    )
    row.answers = {**(row.answers or {}), **result.answers}
    row.last_event_at = utcnow()
    await session.flush()
    return {"ok": True, "leadId": lead_id}


async def assist_context(session: AsyncSession, session_id: str) -> tuple[JourneySession, dict[str, Any]]:
    row = await load_session(session, session_id)
    return row, await pinned_doc(session, row)
