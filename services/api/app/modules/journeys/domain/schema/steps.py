from typing import Annotated, Literal

from pydantic import Field, StringConstraints

from app.modules.journeys.domain.limits import L
from app.modules.journeys.domain.schema.actions import Id, Strict
from app.modules.journeys.domain.schema.conditions import Condition


class StartStep(Strict):
    id: Id
    kind: Literal["start"]


class ScreenStep(Strict):
    id: Id
    kind: Literal["screen"]


class Rule(Strict):
    id: Id
    label: Annotated[str, StringConstraints(max_length=L.rule_label)]
    when: Condition


class ConditionStep(Strict):
    id: Id
    kind: Literal["condition"]
    label: Annotated[str, StringConstraints(max_length=L.rule_label)] | None = None
    rules: list[Rule] = Field(default_factory=list, max_length=L.max_rules)


class RedirectStep(Strict):
    id: Id
    kind: Literal["redirect"]
    url: Annotated[str, StringConstraints(max_length=L.url)]
    pass_params: bool = True
    delay_ms: int = Field(default=0, ge=0, le=10000)


Step = Annotated[StartStep | ScreenStep | ConditionStep | RedirectStep, Field(discriminator="kind")]
