import datetime
import uuid
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


def utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.UTC)


class Lead(Base):
    __tablename__ = "leads"
    __table_args__ = (
        Index("ix_leads_campaign_created", "campaign_id", text("created_at DESC"), text("id DESC")),
        Index(
            "ix_leads_campaign_email",
            "campaign_id",
            "normalized_email",
            postgresql_where=text("normalized_email IS NOT NULL"),
        ),
        Index(
            "ix_leads_campaign_phone",
            "campaign_id",
            "normalized_phone",
            postgresql_where=text("normalized_phone IS NOT NULL"),
        ),
    )
    id: Mapped[str] = mapped_column(Text, primary_key=True)
    campaign_id: Mapped[str] = mapped_column(Text, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    session_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("journey_sessions.id", ondelete="SET NULL")
    )
    version_id: Mapped[str | None] = mapped_column(Text)
    element_id: Mapped[str] = mapped_column(Text, nullable=False)
    data: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    normalized_email: Mapped[str | None] = mapped_column(String(254))
    normalized_phone: Mapped[str | None] = mapped_column(String(32))
    is_test: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), default=utcnow
    )


class WebhookDelivery(Base):
    __tablename__ = "webhook_deliveries"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    lead_id: Mapped[str] = mapped_column(Text, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False)
    attempt: Mapped[int] = mapped_column(Integer, nullable=False)
    status_code: Mapped[int | None] = mapped_column(Integer)
    error: Mapped[str | None] = mapped_column(String(300))
    delivered_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), default=utcnow
    )
