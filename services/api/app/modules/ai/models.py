import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


def utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.UTC)


class AiGenerationJob(Base):
    __tablename__ = "ai_generation_jobs"
    id: Mapped[str] = mapped_column(Text, primary_key=True)
    campaign_id: Mapped[str] = mapped_column(Text, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(12), nullable=False)
    stage: Mapped[str] = mapped_column(String(12), nullable=False)
    brief: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    outline: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    spec: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    issues: Mapped[list[Any] | None] = mapped_column(JSONB)
    fallback_screens: Mapped[list[Any]] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    screens_done: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    cancel_requested: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    error: Mapped[str | None] = mapped_column(String(300))
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), default=utcnow
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), default=utcnow
    )
