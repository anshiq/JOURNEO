from collections.abc import Callable, Iterable
from typing import Any

from app.modules.journeys.domain.analysis import DocIndex, build_index, outline_rank
from app.modules.journeys.domain.rules import answers, compliance, content, links, rules_
from app.modules.journeys.domain.rules.model import Issue, ValidationContext

Rule = Callable[[Any, DocIndex, ValidationContext], Iterable[Issue]]

RULES: list[Rule] = [
    links.check_entry,
    links.check_exits,
    links.check_unreachable,
    links.check_loops,
    rules_.check_rules,
    rules_.check_visibility,
    rules_.check_assistant,
    content.check_content,
    answers.check_answers,
    compliance.check_compliance,
]


def validate(doc: Any, ctx: ValidationContext | None = None) -> list[Issue]:
    context = ctx or ValidationContext()
    index = build_index(doc)
    issues = [issue for check in RULES for issue in check(doc, index, context)]
    keyed = {(i.code, i.message, i.target): i for i in issues}
    unique = list(keyed.values())
    return sorted(unique, key=lambda i: (i.severity != "error", outline_rank(index, i.target), i.code))


def blocking(issues: Iterable[Issue]) -> list[Issue]:
    return [i for i in issues if i.severity == "error"]
