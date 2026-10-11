import itertools
from collections.abc import Iterator
from datetime import datetime
from typing import Any
from urllib.parse import urlparse

from app.modules.journeys.domain.analysis import DocIndex
from app.modules.journeys.domain.rules.model import Issue, Target, ValidationContext, error, warning
from app.modules.journeys.domain.summary import plain, screen_name


def is_web_url(value: str | None) -> bool:
    if not value:
        return False
    parsed = urlparse(value.strip())
    return parsed.scheme in ("http", "https") and bool(parsed.netloc) and " " not in value.strip()


def is_media_src(value: str | None) -> bool:
    if not value:
        return False
    return is_web_url(value) or (value.startswith("/") and not value.startswith("//"))


def parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _action_issues(action: Any, target: Target, label: str) -> Iterator[Issue]:
    if action is None:
        return
    if action.kind == "url" and not is_web_url(action.url):
        yield error("E_URL", f"‘{label}’ needs a valid web address (https://…)", target, "focus_url")
    elif action.kind == "calendar":
        if not action.title.strip() or parse_iso(action.start) is None:
            yield error("E_REQUIRED", f"‘{label}’ needs an event title and start time", target, "focus_field")
        if action.url and not is_web_url(action.url):
            yield error("E_URL", f"‘{label}’ has an invalid event link", target, "focus_url")
    elif action.kind in ("copy", "tel", "mailto") and not action.value.strip():
        yield error("E_REQUIRED", f"‘{label}’ needs a value", target, "focus_field")


def check_content(doc: Any, index: DocIndex, ctx: ValidationContext) -> Iterator[Issue]:
    for sid, screen in doc.screens.items():
        name = screen_name(screen)
        if not screen.elements and not (screen.layout.media and screen.layout.media.src):
            yield warning("W_EMPTY_SCREEN", f"‘{name}’ has no content", Target(kind="screen", id=sid), "insert_element")
        media = screen.layout.media
        if screen.layout.preset in ("split", "cover") and media is not None and not is_media_src(media.src):
            yield error(
                "E_REQUIRED",
                f"‘{name}’ needs an image for its layout",
                Target(kind="screen", id=sid, field="media"),
                "focus_field",
            )
        forms = [e for e in screen.elements if e.type == "form"]
        for extra in forms[1:]:
            yield error(
                "E_FORM_MULTI",
                "A screen can only have one form, move this one to its own screen",
                Target(kind="element", id=extra.id, screen_id=sid),
                "focus_element",
            )
        for el in screen.elements:
            yield from _element_issues(el, sid)
    for step in doc.steps:
        if step.kind == "redirect" and not is_web_url(step.url):
            yield error(
                "E_URL",
                "The redirect needs a valid web address (https://…)",
                Target(kind="step", id=step.id, field="url"),
                "focus_url",
            )
    legal = doc.settings.legal
    for field, value in (("privacyUrl", legal.privacy_url), ("termsUrl", legal.terms_url)):
        if value and not is_web_url(value):
            yield error(
                "E_URL",
                "The legal link needs a valid web address",
                Target(kind="settings", id="legal", field=field),
                "focus_url",
            )


def _element_issues(el: Any, sid: str) -> Iterator[Issue]:
    props = el.props

    def at(field: str | None = None, item: str | None = None) -> Target:
        return Target(kind="item" if item else "element", id=el.id, screen_id=sid, item_id=item, field=field)

    match el.type:
        case "heading":
            if not props.text.strip():
                yield error("E_REQUIRED", "Add text to this heading", at("text"), "focus_field")
        case "text":
            if not props.text.strip():
                yield error("E_REQUIRED", "Add text to this paragraph", at("text"), "focus_field")
        case "image":
            if not is_media_src(props.src):
                yield error("E_REQUIRED", "Choose an image", at("src"), "focus_field")
            yield from _action_issues(props.action, at("action"), "Image link")
        case "video":
            if not is_web_url(props.source.url) and not is_media_src(props.source.url):
                yield error("E_REQUIRED", "Add a video link or upload a video", at("source"), "focus_field")
        case "buttons":
            if not props.items:
                yield error("E_REQUIRED", "Add at least one button", at("items"), "focus_field")
            for item in props.items:
                if not item.label.strip():
                    yield error("E_REQUIRED", "Give this button a label", at("label", item.id), "focus_field")
                yield from _action_issues(item.action, at("action", item.id), plain(item.label, 30) or "Button")
        case "cards":
            if not props.items:
                yield error("E_REQUIRED", "Add at least one card", at("items"), "focus_field")
            for item in props.items:
                if not item.title.strip():
                    yield error("E_REQUIRED", "Give this card a title", at("title", item.id), "focus_field")
                if item.image and not is_media_src(item.image):
                    yield error("E_URL", "This card image link is not valid", at("image", item.id), "focus_url")
                if item.button is not None:
                    if not item.button.label.strip():
                        yield error("E_REQUIRED", "Give this card button a label", at("button", item.id), "focus_field")
                    yield from _action_issues(item.button.action, at("button", item.id), plain(item.title, 30))
        case "countdown":
            if parse_iso(props.deadline) is None:
                yield error("E_REQUIRED", "Choose a valid deadline", at("deadline"), "focus_field")
        case "choice":
            yield from _choice_issues(el, at)
        case "rating":
            if props.branch_by_score:
                bands = sorted(props.bands or [], key=lambda b: b.min)
                top = 10 if props.scale == "nps" else props.max
                if not bands:
                    yield error("E_REQUIRED", "Add score ranges to branch by score", at("bands"), "focus_field")
                for band in bands:
                    if band.min > band.max or band.max > top:
                        yield error(
                            "E_REQUIRED", f"Range ‘{band.label}’ is not valid", at("bands", band.id), "focus_field"
                        )
                for prev, cur in itertools.pairwise(bands):
                    if cur.min <= prev.max:
                        yield error(
                            "E_REQUIRED",
                            f"Ranges ‘{prev.label}’ and ‘{cur.label}’ overlap",
                            at("bands", cur.id),
                            "focus_field",
                        )
        case "form":
            if not props.fields:
                yield error("E_REQUIRED", "Add at least one field to this form", at("fields"), "focus_field")
            for field in props.fields:
                if not field.label.strip():
                    yield error("E_REQUIRED", "Give this field a label", at("label", field.id), "focus_field")
                if field.kind == "dropdown" and len(field.options or []) < 2:
                    yield error(
                        "E_REQUIRED",
                        f"‘{field.label}’ needs at least 2 options",
                        at("options", field.id),
                        "focus_field",
                    )
                if field.kind == "consent" and not (field.consent_text or field.label).strip():
                    yield error("E_REQUIRED", "Add consent text", at("consentText", field.id), "focus_field")
        case _:
            return


def _choice_issues(el: Any, at: Any) -> Iterator[Issue]:
    props = el.props
    if not props.question.strip():
        yield error("E_REQUIRED", "Add a question", at("question"), "focus_field")
    if props.display == "yesno":
        if len(props.options) != 2:
            yield error("E_REQUIRED", "Yes/No needs exactly 2 options", at("options"), "focus_field")
    elif len(props.options) < 2:
        yield error("E_REQUIRED", "Add at least 2 options", at("options"), "focus_field")
    for opt in props.options:
        if not opt.label.strip():
            yield error("E_REQUIRED", "Give this option a label", at("label", opt.id), "focus_field")
        if props.display == "pictures" and not opt.image:
            yield error("E_REQUIRED", f"‘{plain(opt.label, 30)}’ needs a picture", at("image", opt.id), "focus_field")
    if props.branch_by_answer and props.multiple:
        yield error(
            "E_BRANCH_MULTI",
            "Branch by answer only works when visitors pick one option",
            at("branchByAnswer"),
            "focus_field",
        )
    if props.multiple and props.min is not None and props.max is not None and props.min > props.max:
        yield error("E_REQUIRED", "The minimum cannot be above the maximum", at("min"), "focus_field")
