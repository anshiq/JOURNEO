from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from app.modules.journeys.domain.limits import L

Goal = Literal["leads", "recommend", "giveaway", "event", "feedback", "offer", "waitlist"]


class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")


class Brand(ApiModel):
    logo_file_key: str | None = Field(default=None, max_length=120)
    logo_url: str | None = Field(default=None, max_length=L.url)
    color: str | None = Field(default=None, pattern=r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")


class Start(ApiModel):
    mode: Literal["blank", "template", "ai"] = "blank"
    template_id: str | None = Field(default=None, max_length=64)


class CreateBody(ApiModel):
    name: str | None = Field(default=None, max_length=L.campaign_name)
    brief: str | None = Field(default=None, max_length=L.brief)
    goal: Goal | None = None
    website_url: str | None = Field(default=None, max_length=L.url)
    audience: str | None = Field(default=None, max_length=L.audience)
    tone: str | None = Field(default=None, max_length=80)
    brand: Brand | None = None
    start: Start = Start()


class PatchBody(ApiModel):
    name: str | None = Field(default=None, min_length=1, max_length=L.campaign_name)
    slug: str | None = Field(default=None, min_length=1, max_length=L.slug)
    archived: bool | None = None
    brief: str | None = Field(default=None, max_length=L.brief)
    goal: Goal | None = None
    audience: str | None = Field(default=None, max_length=L.audience)


class SaveTemplateBody(ApiModel):
    name: str = Field(min_length=1, max_length=L.template_name)
