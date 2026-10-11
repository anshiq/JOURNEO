from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints
from pydantic.alias_generators import to_camel

from app.modules.journeys.domain.limits import L


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, alias_generator=to_camel, populate_by_name=True)


Id = Annotated[str, StringConstraints(pattern=r"^[a-z][a-z0-9_-]{5,20}$")]
AnswerKey = Annotated[str, StringConstraints(max_length=L.answer_key)]
Hex = Annotated[str, StringConstraints(pattern=r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")]
ColorRole = Literal["primary", "accent", "text", "muted", "surface", "background"]
ColorRef = ColorRole | Hex


class NextAction(Strict):
    kind: Literal["next"]


class GotoAction(Strict):
    kind: Literal["goto"]
    skip_validation: bool = False


class UrlAction(Strict):
    kind: Literal["url"]
    url: Annotated[str, StringConstraints(max_length=L.url)]
    new_tab: bool = True
    pass_params: bool = True


class CopyAction(Strict):
    kind: Literal["copy"]
    value: Annotated[str, StringConstraints(max_length=L.short_answer)]


class CalendarAction(Strict):
    kind: Literal["calendar"]
    title: Annotated[str, StringConstraints(max_length=L.calendar_title)]
    start: Annotated[str, StringConstraints(max_length=L.iso_datetime)]
    end: Annotated[str, StringConstraints(max_length=L.iso_datetime)] | None = None
    location: Annotated[str, StringConstraints(max_length=L.calendar_location)] | None = None
    url: Annotated[str, StringConstraints(max_length=L.url)] | None = None


class TelAction(Strict):
    kind: Literal["tel"]
    value: Annotated[str, StringConstraints(max_length=L.phone)]


class MailtoAction(Strict):
    kind: Literal["mailto"]
    value: Annotated[str, StringConstraints(max_length=L.email)]


Action = Annotated[
    NextAction | GotoAction | UrlAction | CopyAction | CalendarAction | TelAction | MailtoAction,
    Field(discriminator="kind"),
]
