import re
from typing import Any

_MARKS = re.compile(r"[*_`#>\[\]()]|\{\{[^}]*\}\}")


def plain(text: str, limit: int = 60) -> str:
    cleaned = " ".join(_MARKS.sub("", text or "").split())
    return cleaned if len(cleaned) <= limit else cleaned[: limit - 1].rstrip() + "…"


def screen_name(screen: Any) -> str:
    for el in screen.elements:
        if el.type == "heading" and el.props.text.strip():
            return plain(el.props.text)
        if el.type in ("choice", "rating") and el.props.question.strip():
            return plain(el.props.question)
    return screen.name or "Untitled screen"


def step_name(doc: Any, step_id: str) -> str:
    screen = doc.screens.get(step_id)
    if screen is not None:
        return screen_name(screen)
    for step in doc.steps:
        if step.id == step_id:
            if step.kind == "condition":
                return step.label or "Condition"
            if step.kind == "redirect":
                return "Redirect"
            return "Start"
    return "Unknown step"


def element_label(el: Any) -> str:
    props = el.props
    match el.type:
        case "heading":
            return f"Heading ‘{plain(props.text, 40)}’"
        case "text":
            return f"Text ‘{plain(props.text, 40)}’"
        case "buttons":
            return "Buttons " + ", ".join(f"‘{plain(i.label, 24)}’" for i in props.items[:2])
        case "choice":
            return f"Question ‘{plain(props.question, 40)}’"
        case "rating":
            return f"Rating ‘{plain(props.question, 40)}’"
        case "form":
            return "Form"
        case "cards":
            return "Cards"
        case _:
            return str(el.type).capitalize()


def doc_summary(doc: Any) -> str:
    names = [screen_name(s) for s in doc.screens.values()]
    return f"{len(names)} screens: " + ", ".join(names[:10])
