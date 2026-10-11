import datetime
from typing import Any

from sqlalchemy import BigInteger, Computed, DateTime, ForeignKey, Index, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


def utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.UTC)


class KnowledgeSource(Base):
    __tablename__ = "knowledge_sources"
    id: Mapped[str] = mapped_column(Text, primary_key=True)
    campaign_id: Mapped[str | None] = mapped_column(Text, ForeignKey("campaigns.id", ondelete="CASCADE"))
    kind: Mapped[str] = mapped_column(String(8), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    uri: Mapped[str | None] = mapped_column(String(2048))
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    status: Mapped[str] = mapped_column(String(8), nullable=False, server_default="pending")
    error: Mapped[str | None] = mapped_column(String(300))
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), default=utcnow
    )


class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    __table_args__ = (
        Index("ix_chunks_tsv", "tsv", postgresql_using="gin"),
        Index("ix_chunks_campaign", "campaign_id"),
    )
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    source_id: Mapped[str] = mapped_column(Text, ForeignKey("knowledge_sources.id", ondelete="CASCADE"), nullable=False)
    campaign_id: Mapped[str | None] = mapped_column(Text, ForeignKey("campaigns.id", ondelete="CASCADE"))
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    tsv: Mapped[Any] = mapped_column(TSVECTOR, Computed("to_tsvector('english'::regconfig, content)", persisted=True))
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), default=utcnow
    )
