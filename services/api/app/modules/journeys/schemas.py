import datetime
from dataclasses import dataclass, field
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel

from app.modules.journeys.domain.limits import L
from app.modules.journeys.domain.rules.model import Issue


class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")


class DraftBody(ApiModel):
    base_revision: int = Field(ge=1)
    doc: dict[str, Any]


class ValidateBody(ApiModel):
    doc: dict[str, Any]


class PublishBody(ApiModel):
    revision: int = Field(ge=1)
    notes: str | None = Field(default=None, max_length=200)


class CheckpointBody(ApiModel):
    reason: Literal["manual", "ai_restyle"] = "manual"


class RestoreBody(ApiModel):
    version_no: int | None = Field(default=None, ge=1)
    checkpoint_id: str | None = Field(default=None, max_length=64)

    @model_validator(mode="after")
    def one_reference(self) -> "RestoreBody":
        if (self.version_no is None) == (self.checkpoint_id is None):
            raise ValueError("Provide either versionNo or checkpointId")
        return self


class Ended(ApiModel):
    kind: Literal["message", "redirect"] = "message"
    message: str | None = Field(default=None, max_length=L.text)
    url: str | None = Field(default=None, max_length=L.url)


class LeadsWebhook(ApiModel):
    url: str = Field(max_length=L.webhook_url)
    enabled: bool = True


class OpsBody(ApiModel):
    paused: bool | None = None
    ends_at: datetime.datetime | None = None
    clear_ends_at: bool = False
    ended: Ended | None = None
    leads_webhook: LeadsWebhook | None = None
    clear_leads_webhook: bool = False


class EditorStateBody(ApiModel):
    dismissed_issues: list[str] = Field(default_factory=list, max_length=500)
    checklist: dict[str, bool] = Field(default_factory=dict, max_length=50)
    coachmarks: dict[str, bool] = Field(default_factory=dict, max_length=20)


class SaveTemplateBody(ApiModel):
    name: str = Field(min_length=1, max_length=L.template_name)


@dataclass(slots=True)
class SaveResult:
    revision: int
    hash: str
    issues: list[Issue]
    conflict: bool = False
    server_doc: dict[str, Any] | None = None


@dataclass(slots=True)
class PublishResult:
    version_no: int
    version_id: str
    published_at: datetime.datetime
    doc_hash: str


@dataclass(slots=True)
class LiveDoc:
    campaign_id: str
    version_id: str
    version_no: int
    doc: dict[str, Any]
    paused: bool
    ended: dict[str, Any]
    ends_at: datetime.datetime | None
    extras: dict[str, Any] = field(default_factory=dict)

    def is_over(self, now: datetime.datetime) -> bool:
        return self.paused or (self.ends_at is not None and self.ends_at <= now)
