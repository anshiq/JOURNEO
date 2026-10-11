from sqlalchemy.ext.asyncio import AsyncSession

from app.core.http import BlockedDestination, ResponseTooLarge
from app.core.logging import log_event
from app.modules.assistant import extract, repo
from app.modules.assistant.chunking import chunk_text
from app.modules.assistant.models import KnowledgeSource


async def content_for(source: KnowledgeSource) -> str:
    if source.kind == "qa":
        question = str(source.payload.get("question") or source.title)
        answer = str(source.payload.get("answer") or "")
        return f"{question}\n\n{answer}"
    if source.kind == "url" and source.uri:
        text, _ = await extract.from_url(source.uri)
        return text
    if source.kind == "pdf":
        return str(source.payload.get("text") or "")
    return ""


async def ingest(session: AsyncSession, source: KnowledgeSource) -> None:
    try:
        text = await content_for(source)
    except BlockedDestination:
        source.status, source.error = "failed", "This address cannot be reached"
    except ResponseTooLarge:
        source.status, source.error = "failed", "The page is too large"
    except Exception as exc:
        source.status, source.error = "failed", f"Could not read this source ({type(exc).__name__})"
    else:
        chunks = chunk_text(text)
        if not chunks:
            source.status, source.error = "failed", "No readable text was found"
        else:
            await repo.replace_chunks(session, source, chunks)
            source.status, source.error = "ready", None
    await session.flush()
    log_event("knowledge ingested", event="ingest", campaign_id=source.campaign_id, status=source.status)
