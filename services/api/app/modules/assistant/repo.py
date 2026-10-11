import uuid
from typing import Any

from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.assistant.models import DocumentChunk, KnowledgeSource


async def insert_source(session: AsyncSession, values: dict[str, Any]) -> KnowledgeSource:
    source = KnowledgeSource(id=str(uuid.uuid4()), status="pending", **values)
    session.add(source)
    await session.flush()
    return source


async def get_source(session: AsyncSession, campaign_id: str, source_id: str) -> KnowledgeSource | None:
    stmt = select(KnowledgeSource).where(KnowledgeSource.id == source_id, KnowledgeSource.campaign_id == campaign_id)
    return (await session.execute(stmt)).scalar_one_or_none()


async def source_by_id(session: AsyncSession, source_id: str) -> KnowledgeSource | None:
    return await session.get(KnowledgeSource, source_id)


async def list_sources(session: AsyncSession, campaign_id: str) -> list[KnowledgeSource]:
    stmt = (
        select(KnowledgeSource).where(KnowledgeSource.campaign_id == campaign_id).order_by(KnowledgeSource.created_at)
    )
    return list((await session.execute(stmt)).scalars().all())


async def has_ready(session: AsyncSession, campaign_id: str) -> bool:
    stmt = (
        select(KnowledgeSource.id)
        .where(KnowledgeSource.campaign_id == campaign_id, KnowledgeSource.status == "ready")
        .limit(1)
    )
    return (await session.execute(stmt)).first() is not None


async def replace_chunks(session: AsyncSession, source: KnowledgeSource, chunks: list[str]) -> None:
    await session.execute(delete(DocumentChunk).where(DocumentChunk.source_id == source.id))
    session.add_all(
        DocumentChunk(source_id=source.id, campaign_id=source.campaign_id, chunk_index=i, content=c)
        for i, c in enumerate(chunks)
    )
    await session.flush()


async def search(session: AsyncSession, campaign_id: str, question: str, limit: int = 6) -> list[dict[str, Any]]:
    rows = await session.execute(
        text(
            "SELECT c.id, c.source_id, s.title, s.uri, "
            "ts_headline('english', c.content, q, 'MaxFragments=2,MaxWords=40,MinWords=15') AS snippet, "
            "ts_rank_cd(c.tsv, q) AS rank FROM document_chunks c "
            "JOIN knowledge_sources s ON s.id = c.source_id, "
            "websearch_to_tsquery('english', :question) q "
            "WHERE c.campaign_id = :campaign_id AND s.status = 'ready' AND c.tsv @@ q "
            "ORDER BY rank DESC LIMIT :limit"
        ),
        {"campaign_id": campaign_id, "question": question, "limit": limit},
    )
    found = [dict(r._mapping) for r in rows]
    if found:
        return found
    rows = await session.execute(
        text(
            "SELECT c.id, c.source_id, s.title, s.uri, left(c.content, 300) AS snippet, "
            "ts_rank_cd(c.tsv, q) AS rank FROM document_chunks c "
            "JOIN knowledge_sources s ON s.id = c.source_id, "
            "to_tsquery('english', :terms) q "
            "WHERE c.campaign_id = :campaign_id AND s.status = 'ready' AND c.tsv @@ q "
            "ORDER BY rank DESC LIMIT :limit"
        ),
        {"campaign_id": campaign_id, "terms": any_terms(question), "limit": limit},
    )
    return [dict(r._mapping) for r in rows]


def any_terms(question: str) -> str:
    import re

    words = [w for w in re.findall(r"[a-zA-Z0-9]{3,}", question.lower())][:12]
    return " | ".join(words) or "nothing"
