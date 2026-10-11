import re
from collections.abc import Iterator
from typing import Any

from app.modules.journeys.domain.analysis import DocIndex
from app.modules.journeys.domain.ports import screen_outputs
from app.modules.journeys.domain.rules.model import Issue, Target, ValidationContext, error

RESERVED = frozenset({"score", "outcomes", "device", "locale", "referrer", "now"})
KEY_PATTERN = re.compile(r"^[a-z][a-z0-9_]{0,39}$")


def check_answers(doc: Any, index: DocIndex, ctx: ValidationContext) -> Iterator[Issue]:
    seen: set[str] = set()
    for sid, screen in doc.screens.items():
        for out in screen_outputs(screen):
            target = Target(kind="element", id=out.element_id, screen_id=sid, field="key")
            if out.key in RESERVED or out.key.startswith(("utm_", "param.")):
                yield error("E_KEY_RESERVED", f"The saved answer name ‘{out.key}’ is reserved", target, "focus_name")
            elif not KEY_PATTERN.match(out.key):
                yield error(
                    "E_KEY_RESERVED",
                    f"The saved answer name ‘{out.key}’ can only use lowercase letters, numbers and _",
                    target,
                    "focus_name",
                )
            if out.key in seen:
                yield error("E_KEY_CONFLICT", f"The saved answer name ‘{out.key}’ is used twice", target, "focus_name")
            seen.add(out.key)
