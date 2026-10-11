import datetime
from collections.abc import Callable
from typing import Any

from pydantic import ValidationError
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.canonical import canonical, doc_hash
from app.core.errors import NotFound, PayloadTooLarge, RevisionConflict, ValidationFailed, pydantic_errors
from app.core.logging import log_event
from app.modules.journeys import repo
from app.modules.journeys.domain.limits import L
from app.modules.journeys.domain.rules.content import is_web_url
from app.modules.journeys.domain.rules.model import Issue, ValidationContext
from app.modules.journeys.domain.schema.doc import JourneyDoc
from app.modules.journeys.domain.validate import blocking, validate
from app.modules.journeys.models import Journey
from app.modules.journeys.schemas import (
    EditorStateBody,
    LiveDoc,
    OpsBody,
    PublishResult,
    RestoreBody,
    SaveResult,
)
from app.modules.journeys.upgraders.v3_to_v4 import ensure_current

CHECKPOINT_EVERY = datetime.timedelta(minutes=10)
ChatReady = Callable[[AsyncSession, str], Any]
_invalidators: list[Callable[[str], None]] = []
_chat_ready: list[ChatReady] = []


def on_live_change(callback: Callable[[str], None]) -> None:
    _invalidators.append(callback)


def use_chat_readiness(check: ChatReady) -> None:
    _chat_ready[:] = [check]


def utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.UTC)


def after_commit(session: AsyncSession, campaign_id: str) -> None:
    def fire(_: object) -> None:
        for callback in _invalidators:
            callback(campaign_id)

    event.listen(session.sync_session, "after_commit", fire, once=True)
    for callback in _invalidators:
        callback(campaign_id)


def parse(raw: Any) -> tuple[dict[str, Any], JourneyDoc, list[Issue]]:
    if not isinstance(raw, dict):
        raise ValidationFailed("The journey must be an object")
    if len(canonical(raw)) > L.doc_max_bytes:
        raise PayloadTooLarge("This journey is too large to save")
    doc, upgrade_issues = ensure_current(raw)
    try:
        parsed = JourneyDoc.model_validate(doc)
    except ValidationError as exc:
        raise ValidationFailed("The journey has structural problems", errors=pydantic_errors(exc)) from exc
    return doc, parsed, upgrade_issues


async def context_for(session: AsyncSession, campaign_id: str | None) -> ValidationContext:
    ready = None
    if campaign_id and _chat_ready:
        ready = bool(await _chat_ready[0](session, campaign_id))
    return ValidationContext(now=utcnow(), chat_ready=ready)


async def check(session: AsyncSession, campaign_id: str | None, raw: Any) -> list[Issue]:
    _, parsed, upgrade_issues = parse(raw)
    ctx = await context_for(session, campaign_id) if parsed.assistant is not None else ValidationContext(now=utcnow())
    return validate(parsed, ctx) + upgrade_issues


async def require(session: AsyncSession, campaign_id: str, *, lock: bool = False) -> Journey:
    journey = await repo.get_by_campaign(session, campaign_id, lock=lock)
    if journey is None:
        raise NotFound("Journey not found")
    return journey


async def create_for_campaign(session: AsyncSession, campaign_id: str, raw: dict[str, Any]) -> Journey:
    doc, _, _ = parse(raw)
    return await repo.create(session, campaign_id, doc, doc_hash(doc))


async def get_workspace(session: AsyncSession, campaign_id: str) -> dict[str, Any]:
    journey = await require(session, campaign_id)
    live = await repo.get_version_by_id(session, journey.live_version_id) if journey.live_version_id else None
    status = status_of(journey.paused, journey.ends_at, journey.draft_hash, live.doc_hash if live else None)
    return {
        "journeyId": journey.id,
        "status": status,
        "draft": {"doc": journey.draft_doc, "revision": journey.draft_revision, "hash": journey.draft_hash},
        "live": {
            "versionNo": live.version_no,
            "versionId": live.id,
            "publishedAt": live.published_at.isoformat(),
            "hash": live.doc_hash,
        }
        if live
        else None,
        "ops": ops_view(journey),
        "editorState": journey.editor_state,
        "migration": {"issues": journey.migration_issues} if journey.migration_issues else None,
    }


def ops_view(journey: Journey) -> dict[str, Any]:
    return {
        "paused": journey.paused,
        "endsAt": journey.ends_at.isoformat() if journey.ends_at else None,
        "ended": journey.ended,
        "leadsWebhook": journey.leads_webhook,
    }


async def save_draft(session: AsyncSession, campaign_id: str, base_revision: int, raw: Any) -> SaveResult:
    doc, parsed, upgrade_issues = parse(raw)
    journey = await require(session, campaign_id)
    new_hash = doc_hash(doc)
    ctx = await context_for(session, campaign_id) if parsed.assistant is not None else ValidationContext(now=utcnow())
    if new_hash == journey.draft_hash:
        return SaveResult(revision=journey.draft_revision, hash=new_hash, issues=validate(parsed, ctx) + upgrade_issues)
    revision = await repo.conditional_update(session, journey.id, base_revision, doc, new_hash)
    if revision is None:
        await session.refresh(journey)
        await repo.insert_checkpoint(session, journey.id, journey.draft_revision, doc, "conflict_rejected")
        await repo.prune_checkpoints(session, journey.id)
        log_event("draft conflict", event="draft_conflict", campaign_id=campaign_id, revision=base_revision)
        return SaveResult(
            revision=journey.draft_revision,
            hash=journey.draft_hash,
            issues=[],
            conflict=True,
            server_doc=journey.draft_doc,
        )
    await maybe_periodic_checkpoint(session, journey, revision, doc)
    return SaveResult(revision=revision, hash=new_hash, issues=validate(parsed, ctx) + upgrade_issues)


async def maybe_periodic_checkpoint(
    session: AsyncSession, journey: Journey, revision: int, doc: dict[str, Any]
) -> None:
    now = utcnow()
    last = journey.last_checkpoint_at
    if last is not None and now - last < CHECKPOINT_EVERY:
        return
    if last is None:
        journey.last_checkpoint_at = now
        await session.flush()
        return
    await repo.insert_checkpoint(session, journey.id, revision, doc, "periodic")
    journey.last_checkpoint_at = now
    await repo.prune_checkpoints(session, journey.id)
    await session.flush()


async def create_checkpoint(session: AsyncSession, campaign_id: str, reason: str) -> str:
    journey = await require(session, campaign_id)
    checkpoint = await repo.insert_checkpoint(session, journey.id, journey.draft_revision, journey.draft_doc, reason)
    await repo.prune_checkpoints(session, journey.id)
    return checkpoint.id


async def replace_draft(
    session: AsyncSession, campaign_id: str, raw: dict[str, Any], reason: str
) -> tuple[int, dict[str, Any]]:
    doc, _, _ = parse(raw)
    journey = await require(session, campaign_id, lock=True)
    await repo.insert_checkpoint(session, journey.id, journey.draft_revision, journey.draft_doc, reason)
    await repo.prune_checkpoints(session, journey.id)
    revision = await repo.force_update(session, journey, doc, doc_hash(doc))
    return revision, doc


async def publish(session: AsyncSession, campaign_id: str, revision: int, notes: str | None = None) -> PublishResult:
    journey = await require(session, campaign_id, lock=True)
    if journey.draft_revision != revision:
        raise RevisionConflict(
            "The journey changed since you opened it",
            serverRevision=journey.draft_revision,
            serverDoc=journey.draft_doc,
        )
    doc, parsed, upgrade_issues = parse(journey.draft_doc)
    issues = validate(parsed, await context_for(session, campaign_id)) + upgrade_issues
    errors = blocking(issues)
    if errors:
        raise ValidationFailed("Fix the highlighted problems before publishing", issues=[i.as_dict() for i in errors])
    version_no = await repo.next_version_no(session, journey.id)
    version = await repo.insert_version(session, journey.id, version_no, doc, doc_hash(doc), notes=notes)
    journey.live_version_id = version.id
    await session.flush()
    after_commit(session, campaign_id)
    log_event("journey published", event="publish", campaign_id=campaign_id, version=version_no)
    return PublishResult(
        version_no=version_no, version_id=version.id, published_at=version.published_at, doc_hash=version.doc_hash
    )


async def publish_migrated(session: AsyncSession, journey: Journey, doc: dict[str, Any], issues: list[Issue]) -> int:
    version_no = await repo.next_version_no(session, journey.id)
    version = await repo.insert_version(
        session,
        journey.id,
        version_no,
        doc,
        doc_hash(doc),
        notes="Migrated",
        migration_issues=[i.as_dict() for i in issues],
    )
    journey.live_version_id = version.id
    await session.flush()
    return version_no


async def list_versions(session: AsyncSession, campaign_id: str) -> list[dict[str, Any]]:
    journey = await require(session, campaign_id)
    return [
        {
            "versionNo": v.version_no,
            "publishedAt": v.published_at.isoformat(),
            "hash": v.doc_hash,
            "notes": v.notes,
            "live": v.id == journey.live_version_id,
            "migrationIssues": len(v.migration_issues or []),
        }
        for v in await repo.list_versions(session, journey.id)
    ]


async def version_doc(session: AsyncSession, campaign_id: str, version_no: int) -> dict[str, Any]:
    journey = await require(session, campaign_id)
    version = await repo.get_version(session, journey.id, version_no)
    if version is None:
        raise NotFound("Version not found")
    doc, _ = ensure_current(version.doc)
    return {"versionNo": version.version_no, "publishedAt": version.published_at.isoformat(), "doc": doc}


async def list_checkpoints(session: AsyncSession, campaign_id: str) -> list[dict[str, Any]]:
    journey = await require(session, campaign_id)
    return [
        {"id": c.id, "revision": c.revision, "reason": c.reason, "createdAt": c.created_at.isoformat()}
        for c in await repo.list_checkpoints(session, journey.id)
    ]


async def checkpoint_doc(session: AsyncSession, campaign_id: str, checkpoint_id: str) -> dict[str, Any]:
    journey = await require(session, campaign_id)
    checkpoint = await repo.get_checkpoint(session, journey.id, checkpoint_id)
    if checkpoint is None:
        raise NotFound("Checkpoint not found")
    doc, _ = ensure_current(checkpoint.doc)
    return {"id": checkpoint.id, "createdAt": checkpoint.created_at.isoformat(), "doc": doc}


async def restore(session: AsyncSession, campaign_id: str, body: RestoreBody) -> dict[str, Any]:
    journey = await require(session, campaign_id)
    if body.version_no is not None:
        version = await repo.get_version(session, journey.id, body.version_no)
        if version is None:
            raise NotFound("Version not found")
        source = version.doc
    else:
        checkpoint = await repo.get_checkpoint(session, journey.id, body.checkpoint_id or "")
        if checkpoint is None:
            raise NotFound("Checkpoint not found")
        source = checkpoint.doc
    revision, doc = await replace_draft(session, campaign_id, ensure_current(source)[0], "before_restore")
    return {"revision": revision, "doc": doc, "hash": doc_hash(doc)}


async def set_ops(session: AsyncSession, campaign_id: str, body: OpsBody) -> dict[str, Any]:
    journey = await require(session, campaign_id)
    if body.paused is not None:
        journey.paused = body.paused
    if body.clear_ends_at:
        journey.ends_at = None
    elif body.ends_at is not None:
        ends = body.ends_at if body.ends_at.tzinfo else body.ends_at.replace(tzinfo=datetime.UTC)
        journey.ends_at = ends
    if body.ended is not None:
        if body.ended.kind == "redirect" and not is_web_url(body.ended.url):
            raise ValidationFailed("The ended redirect needs a valid web address", field="ended.url")
        journey.ended = body.ended.model_dump(by_alias=True, exclude_none=True)
    if body.clear_leads_webhook:
        journey.leads_webhook = None
    elif body.leads_webhook is not None:
        if not is_web_url(body.leads_webhook.url) or not body.leads_webhook.url.startswith("https://"):
            raise ValidationFailed("The webhook needs a valid https:// address", field="leadsWebhook.url")
        journey.leads_webhook = body.leads_webhook.model_dump(by_alias=True)
    await session.flush()
    after_commit(session, campaign_id)
    return ops_view(journey)


async def set_editor_state(session: AsyncSession, campaign_id: str, body: EditorStateBody) -> None:
    journey = await require(session, campaign_id)
    journey.editor_state = body.model_dump(by_alias=True)
    await session.flush()


async def get_draft(session: AsyncSession, campaign_id: str) -> tuple[dict[str, Any], int, str]:
    journey = await require(session, campaign_id)
    doc, _ = ensure_current(journey.draft_doc)
    return doc, journey.draft_revision, journey.draft_hash


async def live_doc(session: AsyncSession, campaign_id: str) -> LiveDoc | None:
    journey = await repo.get_by_campaign(session, campaign_id)
    if journey is None or journey.live_version_id is None:
        return None
    version = await repo.get_version_by_id(session, journey.live_version_id)
    if version is None:
        return None
    doc, _ = ensure_current(version.doc)
    return LiveDoc(
        campaign_id=campaign_id,
        version_id=version.id,
        version_no=version.version_no,
        doc=doc,
        paused=journey.paused,
        ended=journey.ended or {"kind": "message"},
        ends_at=journey.ends_at,
        extras={"leadsWebhook": journey.leads_webhook},
    )


async def version_by_id(session: AsyncSession, version_id: str) -> tuple[str, dict[str, Any]] | None:
    version = await repo.get_version_by_id(session, version_id)
    if version is None:
        return None
    journey = await session.get(Journey, version.journey_id)
    if journey is None:
        return None
    return journey.campaign_id, ensure_current(version.doc)[0]


async def leads_webhook(session: AsyncSession, campaign_id: str) -> dict[str, Any] | None:
    journey = await repo.get_by_campaign(session, campaign_id)
    return journey.leads_webhook if journey else None


async def save_as_template(session: AsyncSession, campaign_id: str, name: str, goal: str | None) -> str:
    doc, _, _ = await get_draft(session, campaign_id)
    template = await repo.insert_template(session, name, goal, doc)
    return template.id


async def user_templates(session: AsyncSession) -> list[dict[str, Any]]:
    return [
        {"id": t.id, "name": t.name, "goal": t.goal, "source": "mine", "doc": t.doc}
        for t in await repo.list_templates(session)
    ]


async def user_template(session: AsyncSession, template_id: str) -> dict[str, Any] | None:
    template = await repo.get_template(session, template_id)
    if template is None:
        return None
    return {"id": template.id, "name": template.name, "goal": template.goal, "doc": template.doc}


def status_of(paused: bool, ends_at: datetime.datetime | None, draft_hash: str, live_hash: str | None) -> str:
    if live_hash is None:
        return "draft"
    if paused:
        return "paused"
    if ends_at is not None and ends_at <= utcnow():
        return "ended"
    return "live_changes" if live_hash != draft_hash else "live"


async def statuses(session: AsyncSession, campaign_ids: list[str]) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for campaign_id, paused, ends_at, draft_hash, live_hash, version_no in await repo.statuses(session, campaign_ids):
        out[campaign_id] = {"status": status_of(paused, ends_at, draft_hash, live_hash), "liveVersion": version_no}
    return out


async def answer_columns(session: AsyncSession, campaign_id: str) -> list[tuple[str, str]]:
    from app.modules.journeys.domain.analysis import build_index
    from app.modules.journeys.domain.ports import screen_outputs

    live = await live_doc(session, campaign_id)
    raw = live.doc if live else (await get_draft(session, campaign_id))[0]
    doc = JourneyDoc.model_validate(raw)
    index = build_index(doc)
    columns: dict[str, str] = {}
    for step in sorted(doc.steps, key=lambda s: index.order.get(s.id, 10**9)):
        screen = doc.screens.get(step.id)
        if screen is not None:
            for out in screen_outputs(screen):
                columns.setdefault(out.key, out.label)
    return list(columns.items())
