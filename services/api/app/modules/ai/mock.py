import re
from typing import Any

from app.core.llm import MockLlm, register_mock

OUTLINES: dict[str, list[tuple[str, str, bool]]] = {
    "leads": [
        ("Welcome", "welcome", False),
        ("Your goal", "question", False),
        ("Get your plan", "lead-form", False),
        ("Thank you", "thank-you", True),
    ],
    "recommend": [
        ("Welcome", "welcome", False),
        ("Your style", "picture-choice", False),
        ("Your match", "product-picks", True),
    ],
    "giveaway": [
        ("Welcome", "welcome", False),
        ("Enter to win", "lead-form", False),
        ("Thank you", "thank-you", True),
    ],
    "event": [
        ("Welcome", "welcome", False),
        ("Pick a session", "question", False),
        ("Reserve your seat", "lead-form", False),
        ("See you there", "thank-you", True),
    ],
    "feedback": [
        ("Welcome", "welcome", False),
        ("How did we do", "rating-nps", False),
        ("Thanks", "thank-you", True),
    ],
    "offer": [
        ("Welcome", "welcome", False),
        ("Your offer", "offer-countdown", False),
        ("Claim it", "lead-form", False),
        ("Thank you", "thank-you", True),
    ],
    "waitlist": [
        ("Welcome", "welcome", False),
        ("Join the list", "lead-form", False),
        ("You are on the list", "thank-you", True),
    ],
}

GOAL_LINE = re.compile(r"^Goal: (\w+)", re.MULTILINE)
BRIEF_LINE = re.compile(r"^Brief: (.*)$", re.MULTILINE)
SCREEN_LINE = re.compile(r"^- (.+?) \(([a-z-]+)\):", re.MULTILINE)
TEXT_LINE = re.compile(r"^Text: (.*)$", re.MULTILINE)
INSTRUCTION_LINE = re.compile(r"^Instruction: (.*)$", re.MULTILINE)
TEXT_ITEM = re.compile(r"^- (\S+) \(max (\d+)\): (.*)$", re.MULTILINE)


def prompt_of(messages: list[dict[str, Any]]) -> str:
    return str(messages[0].get("content", ""))


def outline(messages: list[dict[str, Any]]) -> dict[str, Any]:
    text = prompt_of(messages)
    goal_match = GOAL_LINE.search(text)
    goal = goal_match.group(1) if goal_match else "leads"
    brief_match = BRIEF_LINE.search(text)
    brief = (brief_match.group(1) if brief_match else "").strip()
    screens = [
        {"title": title, "recipe": recipe, "purpose": brief[:200] or title, "ends": ends}
        for title, recipe, ends in OUTLINES.get(goal, OUTLINES["leads"])
    ]
    return {
        "themeHints": {"primary": "#1d4ed8", "accent": "#f59e0b", "preset": "classic", "pairing": "modern"},
        "screens": screens,
        "gotos": [],
        "branches": [],
    }


def key_of(title: str) -> str:
    return "_".join(re.findall(r"[a-z0-9]+", title.lower())) or "answer"


def heading(title: str) -> dict[str, Any]:
    return {"type": "heading", "props": {"text": title[:90], "level": 1}}


def lead(text: str) -> dict[str, Any]:
    return {"type": "text", "props": {"text": text, "preset": "lead"}}


def next_button(label: str) -> dict[str, Any]:
    return {"type": "buttons", "props": {"items": [{"label": label, "variant": "primary", "action": {"kind": "next"}}]}}


def elements_for(title: str, recipe: str) -> list[dict[str, Any]]:
    key = key_of(title)
    if recipe in ("question", "picture-choice"):
        return [
            heading(title),
            {
                "type": "choice",
                "props": {
                    "question": f"{title}?",
                    "key": key,
                    "display": "list" if recipe == "question" else "buttons",
                    "autoAdvance": True,
                    "required": True,
                    "options": [{"label": "Option A"}, {"label": "Option B"}, {"label": "Option C"}],
                },
            },
        ]
    if recipe == "rating-nps":
        return [
            heading(title),
            {
                "type": "rating",
                "props": {
                    "question": "How likely are you to recommend us?",
                    "key": key,
                    "scale": "nps",
                    "required": True,
                },
            },
        ]
    if recipe == "lead-form":
        return [
            heading(title),
            lead("Tell us where to send it."),
            {
                "type": "form",
                "props": {
                    "fields": [
                        {"kind": "name", "label": "Name", "key": "name", "required": True},
                        {"kind": "email", "label": "Email", "key": "email", "required": True},
                        {
                            "kind": "consent",
                            "label": "Consent",
                            "key": "consent",
                            "required": True,
                            "consentText": "I agree to be contacted about this.",
                        },
                    ],
                    "submitLabel": "Send",
                },
            },
        ]
    if recipe == "product-picks":
        return [
            heading(title),
            {
                "type": "cards",
                "props": {
                    "items": [
                        {
                            "title": "Option one",
                            "text": "A good fit.",
                            "button": {"label": "Choose", "action": {"kind": "next"}},
                        },
                        {
                            "title": "Option two",
                            "text": "A bold choice.",
                            "button": {"label": "Choose", "action": {"kind": "next"}},
                        },
                    ]
                },
            },
        ]
    if recipe == "offer-countdown":
        return [
            heading(title),
            {"type": "countdown", "props": {"deadline": "2099-12-31T23:59:00Z", "onExpire": "hide"}},
            next_button("Claim it"),
        ]
    if recipe == "thank-you":
        return [heading(title), lead("Thanks, we will be in touch.")]
    return [heading(title), lead("A short introduction that matches the brief."), next_button("Start")]


def content(messages: list[dict[str, Any]]) -> dict[str, Any]:
    text = prompt_of(messages)
    return {
        "screens": [
            {"title": title, "elements": elements_for(title, recipe)} for title, recipe in SCREEN_LINE.findall(text)
        ]
    }


def rewrite(messages: list[dict[str, Any]]) -> dict[str, Any]:
    prompt = prompt_of(messages)
    match = TEXT_LINE.search(prompt)
    text = (match.group(1) if match else "").strip()
    found = INSTRUCTION_LINE.search(prompt)
    instruction = found.group(1).lower() if found else ""
    words = text.split()
    first = re.split(r"(?<=[.!?])\s+", text, maxsplit=1)[0]
    if "short" in instruction:
        main = " ".join(words[: max(3, len(words) // 2)])
    elif "persuas" in instruction:
        main = f"{first.rstrip('.!?')}. Don't miss out."
    elif "friend" in instruction:
        main = f"Hi there! {first}"
    elif "simpl" in instruction:
        main = " ".join(words[:12]).rstrip(".!?")
    else:
        main = first
    return {"suggestions": [main, f"{main} Ready when you are.", f"Hello again: {main}"]}


def screen_copy(text: str) -> str:
    return f"{' '.join(text.split()[:30]).rstrip('.!?')}!"


def rewrite_screen(messages: list[dict[str, Any]]) -> dict[str, Any]:
    return {"texts": {item[0]: screen_copy(item[2]) for item in TEXT_ITEM.findall(prompt_of(messages))}}


def theme(messages: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "colors": {
            "primary": "#0f766e",
            "accent": "#f59e0b",
            "background": "#ffffff",
            "surface": "#f8fafc",
            "text": "#0f172a",
        },
        "pairing": "modern",
        "radius": "lg",
        "buttons": "solid",
    }


def install() -> None:
    register_mock("ai.outline", outline)
    register_mock("ai.content", content)
    register_mock("ai.rewrite", rewrite)
    register_mock("ai.rewrite_screen", rewrite_screen)
    register_mock("ai.theme", theme)
    MockLlm.alt_text = "A photo that matches the campaign"
