import datetime
from typing import Any

from sqlalchemy import CHAR, Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


def utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.UTC)


class Journey(Base):
    __tablename__ = "journeys"
    id: Mapped[str] = mapped_column(Text, primary_key=True)
    campaign_id: Mapped[str] = mapped_column(
        Text, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    draft_doc: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    draft_revision: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    draft_hash: Mapped[str] = mapped_column(CHAR(64), nullable=False)
    schema_version: Mapped[int] = mapped_column(Integer, nullable=False)
    live_version_id: Mapped[str | None] = mapped_column(
        Text,
        ForeignKey(
            "journey_versions.id",
            use_alter=True,
            deferrable=True,
            initially="DEFERRED",
            name="fk_journeys_live_version_id_journey_versions",
        ),
    )
    paused: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    ends_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True))
    ended: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default=text('\'{"kind": "message"}\'::jsonb')
    )
    leads_webhook: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    editor_state: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    legacy_graph_json: Mapped[str | None] = mapped_column(Text)
    migration_error: Mapped[str | None] = mapped_column(Text)
    migration_issues: Mapped[list[Any] | None] = mapped_column(JSONB)
    last_checkpoint_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), default=utcnow
    )


class JourneyVersion(Base):
    __tablename__ = "journey_versions"
    __table_args__ = (UniqueConstraint("journey_id", "version_no", name="uq_journey_versions_journey_id_version_no"),)
    id: Mapped[str] = mapped_column(Text, primary_key=True)
    journey_id: Mapped[str] = mapped_column(Text, ForeignKey("journeys.id", ondelete="CASCADE"), nullable=False)
    version_no: Mapped[int] = mapped_column(Integer, nullable=False)
    doc: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    doc_hash: Mapped[str] = mapped_column(CHAR(64), nullable=False)
    schema_version: Mapped[int] = mapped_column(Integer, nullable=False)
    notes: Mapped[str | None] = mapped_column(String(200))
    migration_issues: Mapped[list[Any] | None] = mapped_column(JSONB)
    published_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), default=utcnow
    )


class JourneyCheckpoint(Base):
    __tablename__ = "journey_draft_checkpoints"
    __table_args__ = (Index("ix_checkpoints_journey_created", "journey_id", text("created_at DESC")),)
    id: Mapped[str] = mapped_column(Text, primary_key=True)
    journey_id: Mapped[str] = mapped_column(Text, ForeignKey("journeys.id", ondelete="CASCADE"), nullable=False)
    revision: Mapped[int] = mapped_column(Integer, nullable=False)
    doc: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    reason: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), default=utcnow
    )


class UserTemplate(Base):
    __tablename__ = "user_templates"
    id: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[str] = mapped_column(String(60), nullable=False)
    goal: Mapped[str | None] = mapped_column(String(32))
    doc: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), default=utcnow
    )
