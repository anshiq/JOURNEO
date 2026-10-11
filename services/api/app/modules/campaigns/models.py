import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


def utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.UTC)


class Campaign(Base):
    __tablename__ = "campaigns"
    id: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    slug: Mapped[str] = mapped_column(String(60), nullable=False, unique=True)
    brief: Mapped[str] = mapped_column(String(2000), nullable=False, server_default="")
    goal: Mapped[str | None] = mapped_column(String(32))
    audience: Mapped[str] = mapped_column(String(300), nullable=False, server_default="")
    dev_token: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    webhook_secret: Mapped[str] = mapped_column(Text, nullable=False)
    archived: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), default=utcnow
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), default=utcnow
    )
    deleted_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True))


class CampaignSlug(Base):
    __tablename__ = "campaign_slugs"
    slug: Mapped[str] = mapped_column(String(60), primary_key=True)
    campaign_id: Mapped[str] = mapped_column(Text, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), default=utcnow
    )
