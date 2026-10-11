import datetime
import uuid
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

from app.modules.journeys.domain.limits import L

EventType = Literal[
    "session_start",
    "screen_view",
    "answer",
    "exit",
    "cta_click",
    "form_submit",
    "assist_query",
    "complete",
    "engine_error",
]


class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="ignore")


class SessionBody(ApiModel):
    id: uuid.UUID
    campaign_id: str = Field(max_length=64)
    version_id: str | None = Field(default=None, max_length=64)
    dev_token: str | None = Field(default=None, max_length=64)
    device: Literal["mobile", "tablet", "desktop"] | None = None
    utm: dict[str, str] = Field(default_factory=dict, max_length=20)
    referrer: str | None = Field(default=None, max_length=2048)
    locale: str | None = Field(default=None, max_length=35)

    @field_validator("utm")
    @classmethod
    def bound_utm(cls, value: dict[str, str]) -> dict[str, str]:
        return {k[:40]: str(v)[:250] for k, v in value.items() if k.startswith(("utm_", "param."))}


class EventIn(ApiModel):
    seq: int = Field(ge=0, le=1_000_000)
    type: EventType
    step: str | None = Field(default=None, max_length=64)
    element: str | None = Field(default=None, max_length=64)
    port: str | None = Field(default=None, max_length=L.port)
    payload: dict[str, Any] = Field(default_factory=dict)
    client_ts: datetime.datetime | None = None

    @field_validator("payload")
    @classmethod
    def bound_payload(cls, value: dict[str, Any]) -> dict[str, Any]:
        import orjson

        if len(orjson.dumps(value)) > 4096:
            raise ValueError("payload too large")
        return value


class EventsBody(ApiModel):
    events: list[dict[str, Any]] = Field(default_factory=list, max_length=L.events_batch)


class SubmitBody(ApiModel):
    step_id: str = Field(max_length=64)
    element_id: str = Field(max_length=64)
    answers: dict[str, Any] = Field(default_factory=dict, max_length=60)
    consent: dict[str, Any] | None = None
    hp: str | None = Field(default=None, max_length=200)


class AssistBody(ApiModel):
    question: str = Field(min_length=1, max_length=L.chat_question)
    step_id: str | None = Field(default=None, max_length=64)
