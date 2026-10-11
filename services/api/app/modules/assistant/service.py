from typing import Any

from cachetools import TTLCache
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.errors import NotFound, ValidationFailed
from app.core.llm import LlmClient, LlmUnavailable, make_llm
from app.modules.assistant import chat, repo
from app.modules.assistant.models import KnowledgeSource
from app.modules.campaigns import service as campaigns
from app.modules.journeys import service as journeys
from app.modules.journeys.domain.rules.content import is_web_url
from app.modules.journeys.domain.schema.doc import JourneyDoc
from app.modules.journeys.domain.summary import doc_summary

_answers = TTLCache[tuple[str, str, str], dict[str, Any]](maxsize=1024, ttl=600)


def source_view(source: KnowledgeSource) -> dict[str, Any]:
    return {
        "id": source.id,
        "kind": source.kind,
        "title": source.title,
        "url": source.uri,
        "status": source.status,
        "error": source.error,
        "createdAt": source.created_at.isoformat(),
    }


async def schedule(source: KnowledgeSource) -> None:
    from app.modules.assistant.tasks import ingest_source

    await ingest_source.configure(queueing_lock=f"ingest:{source.id}").defer_async(source_id=source.id)


async def add_url_source(
    session: AsyncSession, campaign_id: str, url: str, title: str | None = None
) -> KnowledgeSource:
    if not is_web_url(url):
        raise ValidationFailed("Enter a valid web address", field="url")
    source = await repo.insert_source(
        session, {"campaign_id": campaign_id, "kind": "url", "title": (title or url)[:200], "uri": url[:2048]}
    )
    await schedule(source)
    return source


async def add_qa_source(session: AsyncSession, campaign_id: str, question: str, answer: str) -> KnowledgeSource:
    if not question.strip() or not answer.strip():
        raise ValidationFailed("Add a question and an answer")
    source = await repo.insert_source(
        session,
        {
            "campaign_id": campaign_id,
            "kind": "qa",
            "title": question[:200],
            "payload": {"question": question, "answer": answer},
        },
    )
    await schedule(source)
    return source


async def add_pdf_source(session: AsyncSession, campaign_id: str, filename: str, text: str) -> KnowledgeSource:
    source = await repo.insert_source(
        session,
        {
            "campaign_id": campaign_id,
            "kind": "pdf",
            "title": filename[:200] or "PDF",
            "payload": {"text": text[:400000]},
        },
    )
    await schedule(source)
    return source


async def list_sources(session: AsyncSession, campaign_id: str) -> list[dict[str, Any]]:
    return [source_view(s) for s in await repo.list_sources(session, campaign_id)]


async def delete_source(session: AsyncSession, campaign_id: str, source_id: str) -> None:
    source = await repo.get_source(session, campaign_id, source_id)
    if source is None:
        raise NotFound("Source not found")
    await session.delete(source)
    await session.flush()


async def retry_source(session: AsyncSession, campaign_id: str, source_id: str) -> dict[str, Any]:
    source = await repo.get_source(session, campaign_id, source_id)
    if source is None:
        raise NotFound("Source not found")
    source.status, source.error = "pending", None
    await session.flush()
    await schedule(source)
    return source_view(source)


async def has_ready_sources(session: AsyncSession, campaign_id: str) -> bool:
    return await repo.has_ready(session, campaign_id)


journeys.use_chat_readiness(has_ready_sources)


def llm_for(settings: Settings) -> LlmClient | None:
    try:
        return make_llm(settings.llm)
    except LlmUnavailable:
        return None


def fallback(config: dict[str, Any]) -> dict[str, Any]:
    cta = None
    if config.get("fallbackCtaLabel") and config.get("fallbackTarget"):
        cta = {"label": config["fallbackCtaLabel"], "target": config["fallbackTarget"]}
    return {
        "answer": config.get("fallback") or "I could not find an answer to that.",
        "citations": [],
        "fallback": True,
        "cta": cta,
    }


async def answer(
    session: AsyncSession,
    settings: Settings,
    *,
    campaign_id: str,
    version_key: str,
    doc: dict[str, Any],
    question: str,
    step_id: str | None,
) -> dict[str, Any]:
    config = doc.get("assistant") or {}
    if not doc.get("assistant"):
        return {"answer": "Chat is not available here.", "citations": [], "fallback": True, "cta": None}
    normalized = " ".join(question.lower().split())[:500]
    key = (campaign_id, version_key, normalized)
    if key in _answers:
        return _answers[key]
    hits = await repo.search(session, campaign_id, question)
    if not hits:
        result = fallback(config)
    else:
        campaign = await campaigns.get(session, campaign_id)
        parsed = JourneyDoc.model_validate(doc)
        composed = await chat.compose_answer(
            llm_for(settings),
            settings.llm.model,
            campaign.name,
            parsed.theme.voice,
            doc_summary(parsed),
            question,
            hits,
        )
        result = fallback(config) if composed["fallback"] else {**composed, "cta": None}
    _answers[key] = result
    return result


async def playground(session: AsyncSession, settings: Settings, campaign_id: str, question: str) -> dict[str, Any]:
    doc, revision, _ = await journeys.get_draft(session, campaign_id)
    if not doc.get("assistant"):
        doc = {**doc, "assistant": {"fallback": "Visitor chat is off for this campaign."}}
    return await answer(
        session,
        settings,
        campaign_id=campaign_id,
        version_key=f"play:{revision}",
        doc=doc,
        question=question,
        step_id=None,
    )


async def ensure_campaign(session: AsyncSession, campaign_id: str) -> None:
    await campaigns.get(session, campaign_id)
