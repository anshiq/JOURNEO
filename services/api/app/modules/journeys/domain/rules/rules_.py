import re
from collections.abc import Iterator
from typing import Any

from app.modules.journeys.domain.analysis import DocIndex
from app.modules.journeys.domain.ports import screen_outputs
from app.modules.journeys.domain.rules.model import Issue, Target, ValidationContext, error, warning
from app.modules.journeys.domain.schema.conditions import CHOICE_OPS, CHOICES_OPS, NUMBER_OPS, TEXT_OPS, leaves
from app.modules.journeys.domain.summary import plain

SYSTEM_TYPES = {
    "score": "number",
    "outcomes": "outcomes",
    "device": "device",
    "locale": "text",
    "referrer": "text",
    "now": "date",
}
TOKEN = re.compile(r"\{\{\s*([a-zA-Z0-9_.]+)\s*(?:\|[^}]*)?\}\}")
OPS_BY_TYPE: dict[str, tuple[str, ...]] = {
    "choice": CHOICE_OPS,
    "choices": CHOICES_OPS,
    "rating": NUMBER_OPS,
    "number": NUMBER_OPS,
    "text": TEXT_OPS,
    "email": TEXT_OPS,
    "phone": TEXT_OPS,
    "boolean": ("isTrue", "isFalse"),
    "date": ("before", "after"),
    "device": ("is",),
    "outcomes": ("topOutcome",),
}


def is_system(key: str) -> bool:
    return key in SYSTEM_TYPES or key.startswith(("utm_", "param."))


def answer_catalog(doc: Any) -> dict[str, tuple[str, set[str]]]:
    catalog: dict[str, tuple[str, set[str]]] = {}
    for screen in doc.screens.values():
        for out in screen_outputs(screen):
            option_ids = {i for i, _ in out.options}
            if out.type in ("choice", "choices"):
                for el in screen.elements:
                    if el.id == out.element_id and el.type == "choice" and el.props.other:
                        option_ids.add("other")
            catalog.setdefault(out.key, (out.type, option_ids))
    return catalog


def type_of(key: str, catalog: dict[str, tuple[str, set[str]]]) -> str | None:
    if key in catalog:
        return catalog[key][0]
    if key in SYSTEM_TYPES:
        return SYSTEM_TYPES[key]
    if key.startswith(("utm_", "param.")):
        return "text"
    return None


def leaf_problem(leaf: Any, catalog: dict[str, tuple[str, set[str]]], doc: Any) -> str | None:
    answer_type = type_of(leaf.answer, catalog)
    if answer_type is None:
        return f"‘{leaf.answer}’ is not a saved answer"
    if leaf.op not in OPS_BY_TYPE.get(answer_type, ()):
        return f"This comparison does not fit the answer ‘{leaf.answer}’"
    value = getattr(leaf, "value", None)
    if leaf.op in ("isEmpty", "isNotEmpty", "isTrue", "isFalse"):
        return None
    if leaf.op in CHOICE_OPS + CHOICES_OPS:
        if not value:
            return "Pick at least one option"
        unknown = [v for v in value if v not in catalog.get(leaf.answer, ("", set()))[1]]
        return "An option in this rule no longer exists" if unknown else None
    if leaf.op == "topOutcome":
        return None if value in doc.screens else "The result screen in this rule no longer exists"
    if value is None or value == "":
        return "Add a value to compare with"
    if leaf.op == "between" and (leaf.value2 is None or leaf.value2 < leaf.value):
        return "Add a valid range"
    return None


def check_rules(doc: Any, index: DocIndex, ctx: ValidationContext) -> Iterator[Issue]:
    catalog = answer_catalog(doc)
    for step in doc.steps:
        if step.kind != "condition":
            continue
        for rule in step.rules:
            target = Target(kind="step", id=step.id, item_id=rule.id, field="when")
            items = leaves(rule.when)
            if not items:
                yield error("J_RULE", f"Rule ‘{plain(rule.label, 30)}’ is incomplete", target, "focus_rule")
                continue
            for leaf in items:
                problem = leaf_problem(leaf, catalog, doc)
                if problem:
                    yield error("J_RULE", problem, target, "focus_rule")
                    break
                if is_system(leaf.answer) or step.id not in index.reachable:
                    continue
                if leaf.answer not in index.may.get(step.id, set()):
                    yield error(
                        "J_RULE",
                        f"‘{leaf.answer}’ is never answered before this rule",
                        target,
                        "focus_rule",
                    )
                    break
                if leaf.answer not in index.must.get(step.id, set()):
                    yield warning(
                        "W_ANSWER_MAYBE",
                        f"Some visitors reach this rule without answering ‘{leaf.answer}’",
                        target,
                        "highlight",
                    )


def check_visibility(doc: Any, index: DocIndex, ctx: ValidationContext) -> Iterator[Issue]:
    catalog = answer_catalog(doc)
    for sid, screen in doc.screens.items():
        own = index.produced.get(sid, set())
        for el in screen.elements:
            if el.visible_if is not None:
                target = Target(kind="element", id=el.id, screen_id=sid, field="visibleIf")
                for leaf in leaves(el.visible_if):
                    problem = leaf_problem(leaf, catalog, doc)
                    if problem:
                        yield error("J_RULE", problem, target, "focus_rule")
                        break
                    if is_system(leaf.answer) or leaf.answer in own or sid not in index.reachable:
                        continue
                    if leaf.answer not in index.must.get(sid, set()):
                        yield warning(
                            "W_ANSWER_MAYBE",
                            f"Some visitors arrive here without answering ‘{leaf.answer}’",
                            target,
                            "highlight",
                        )
            for field, text in _texts(el):
                for key in TOKEN.findall(text):
                    if is_system(key) or sid not in index.reachable:
                        continue
                    if key not in catalog:
                        yield warning(
                            "W_ANSWER_MAYBE",
                            f"‘{key}’ is not a saved answer",
                            Target(kind="element", id=el.id, screen_id=sid, field=field),
                            "highlight",
                        )
                    elif key not in index.must.get(sid, set()):
                        yield warning(
                            "W_ANSWER_MAYBE",
                            f"Some visitors arrive here without answering ‘{key}’, the fallback text is shown",
                            Target(kind="element", id=el.id, screen_id=sid, field=field),
                            "highlight",
                        )


def _texts(el: Any) -> list[tuple[str, str]]:
    if el.type in ("heading", "text"):
        return [("text", el.props.text)]
    if el.type in ("choice", "rating"):
        return [("question", el.props.question)]
    return []


def check_assistant(doc: Any, index: DocIndex, ctx: ValidationContext) -> Iterator[Issue]:
    assistant = doc.assistant
    if assistant is None:
        return
    if assistant.fallback_target and assistant.fallback_target not in doc.screens:
        yield error(
            "J_RULE",
            "The chat fallback button points to a screen that no longer exists",
            Target(kind="assistant", id="assistant", field="fallbackTarget"),
            "open_chat",
        )
    if ctx.chat_ready is False:
        yield warning(
            "W_CHAT_SOURCES",
            "Visitor chat has no ready sources yet, it will only show the fallback answer",
            Target(kind="assistant", id="assistant"),
            "open_chat",
        )
