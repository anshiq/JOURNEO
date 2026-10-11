import datetime
import uuid
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


def utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.UTC)


class JourneySession(Base):
    __tablename__ = "journey_sessions"
    __table_args__ = (Index("ix_sessions_campaign_started", "campaign_id", text("started_at DESC")),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    campaign_id: Mapped[str] = mapped_column(Text, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    version_id: Mapped[str | None] = mapped_column(Text, ForeignKey("journey_versions.id", ondelete="SET NULL"))
    draft_revision: Mapped[int | None] = mapped_column(Integer)
    is_test: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    device: Mapped[str | None] = mapped_column(String(8))
    utm: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    referrer: Mapped[str | None] = mapped_column(String(2048))
    answers: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    started_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), default=utcnow
    )
    last_event_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), default=utcnow
    )
    completed_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True))
    end_step_id: Mapped[str | None] = mapped_column(Text)


class JourneyEvent(Base):
    __tablename__ = "journey_events"
    __table_args__ = (
        UniqueConstraint("session_id", "seq", name="uq_journey_events_session_id_seq"),
        Index("ix_events_campaign_type_created", "campaign_id", "type", "created_at"),
    )
    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("journey_sessions.id", ondelete="CASCADE"), nullable=False
    )
    campaign_id: Mapped[str] = mapped_column(Text, nullable=False)
    version_id: Mapped[str | None] = mapped_column(Text)
    seq: Mapped[int] = mapped_column(Integer, nullable=False)
    type: Mapped[str] = mapped_column(String(24), nullable=False)
    step_id: Mapped[str | None] = mapped_column(Text)
    element_id: Mapped[str | None] = mapped_column(Text)
    port: Mapped[str | None] = mapped_column(Text)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    is_test: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    client_ts: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), default=utcnow
    )
