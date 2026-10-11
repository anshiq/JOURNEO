import copy
import re
from typing import Any

from app.modules.journeys import library

GOAL_TEMPLATES = {
    "leads": "lead-gen-launch",
    "waitlist": "lead-gen-launch",
    "giveaway": "lead-gen-launch",
    "offer": "lead-gen-launch",
    "recommend": "product-quiz",
    "event": "event-registration",
    "feedback": "feedback-nps",
}


def headline(brief: str, limit: int = 80) -> str:
    text = " ".join(brief.split())
    first = re.split(r"(?<=[.!?])\s+", text, maxsplit=1)[0].rstrip(".")
    if len(first) > limit:
        first = first[: limit - 1].rsplit(" ", 1)[0] + "…"
    return first[:1].upper() + first[1:]


def goal_doc(goal: str | None, brief: str | None) -> dict[str, Any]:
    template = library.template(GOAL_TEMPLATES.get(goal or "leads", "lead-gen-launch")) or library.templates()[0]
    doc = copy.deepcopy(template["doc"])
    text = (brief or "").strip()
    if not text:
        return doc
    first_step = next((s for s in doc.get("steps", []) if s.get("kind") == "start"), None)
    first_id = doc.get("links", {}).get(first_step["id"], {}).get("next") if first_step else None
    screen = doc.get("screens", {}).get(first_id or "")
    if screen is None:
        return doc
    heading_done = text_done = False
    for el in screen.get("elements", []):
        if el["type"] == "heading" and not heading_done:
            el["props"]["text"] = headline(text)
            heading_done = True
        elif el["type"] == "text" and el["props"].get("preset", "body") in ("body", "lead") and not text_done:
            el["props"]["text"] = " ".join(text.split())[:300]
            text_done = True
    return doc


def recipe_elements(recipe_id: str) -> list[dict[str, Any]]:
    recipe = library.recipes_by_id().get(recipe_id) or {}
    return copy.deepcopy(recipe.get("elements", []))
