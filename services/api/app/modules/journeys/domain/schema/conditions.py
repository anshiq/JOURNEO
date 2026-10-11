from typing import Annotated, Any, Literal

from pydantic import Field, StringConstraints

from app.modules.journeys.domain.limits import L
from app.modules.journeys.domain.schema.actions import AnswerKey, Id, Strict

TEXT_OPS = ("equals", "notEquals", "contains", "notContains", "isEmpty", "isNotEmpty")
NUMBER_OPS = ("eq", "neq", "gt", "gte", "lt", "lte", "between")
CHOICE_OPS = ("anyOf", "noneOf")
CHOICES_OPS = ("includesAny", "includesAll", "includesNone")


class TextCondition(Strict):
    op: Literal["equals", "notEquals", "contains", "notContains", "isEmpty", "isNotEmpty"]
    answer: AnswerKey
    value: Annotated[str, StringConstraints(max_length=L.short_answer)] | None = None


class NumberCondition(Strict):
    op: Literal["eq", "neq", "gt", "gte", "lt", "lte", "between"]
    answer: AnswerKey
    value: float | None = None
    value2: float | None = None


class ChoiceCondition(Strict):
    op: Literal["anyOf", "noneOf", "includesAny", "includesAll", "includesNone"]
    answer: AnswerKey
    value: list[Id] = Field(default_factory=list, max_length=L.max_options)


class BoolCondition(Strict):
    op: Literal["isTrue", "isFalse"]
    answer: AnswerKey


class DeviceCondition(Strict):
    op: Literal["is"]
    answer: Literal["device"] = "device"
    value: Literal["mobile", "tablet", "desktop"] = "mobile"


class OutcomeCondition(Strict):
    op: Literal["topOutcome"]
    answer: Literal["outcomes"] = "outcomes"
    value: Id


class DateCondition(Strict):
    op: Literal["before", "after"]
    answer: AnswerKey
    value: Annotated[str, StringConstraints(max_length=L.iso_datetime)]


LeafCondition = Annotated[
    TextCondition
    | NumberCondition
    | ChoiceCondition
    | BoolCondition
    | DeviceCondition
    | OutcomeCondition
    | DateCondition,
    Field(discriminator="op"),
]


class AllGroup(Strict):
    all: list[LeafCondition] = Field(max_length=L.max_rules)


class AnyGroup(Strict):
    any: list[LeafCondition] = Field(max_length=L.max_rules)


Condition = AllGroup | AnyGroup | LeafCondition


def leaves(condition: object) -> list[Any]:
    if isinstance(condition, AllGroup):
        return list(condition.all)
    if isinstance(condition, AnyGroup):
        return list(condition.any)
    return [condition]
