import re
from dataclasses import dataclass, field
from typing import Any, cast

from app.modules.journeys.domain.ops import export_slug
from app.modules.journeys.upgraders import IdRegistry

FIELD_KINDS = {"name", "email", "phone", "company", "text", "longtext", "number", "date", "dropdown", "consent"}
INPUT_KIND_ALIASES = {"tel": "phone", "textarea": "longtext", "input": "text", "string": "text", "url": "text"}
STYLE_KEYS = ("align", "size")
SIZE_STEPS = ((13, "xs"), (15, "sm"), (17, "md"), (22, "lg"))
PX = re.compile(r"^\s*(\d+(?:\.\d+)?)\s*(px|rem|em)?\s*$")


@dataclass
class Answer:
    key: str
    type: str
    options: dict[str, str] = field(default_factory=dict)


@dataclass
class Block:
    elements: list[dict[str, Any]] = field(default_factory=list)
    handles: dict[str, tuple[str, str | None]] = field(default_factory=dict)
    media: dict[str, Any] | None = None
    form_fields: list[dict[str, Any]] = field(default_factory=list)
    answers: list[Answer] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)


def as_mapping(value: Any) -> dict[str, Any]:
    return cast(dict[str, Any], value) if isinstance(value, dict) else {}


def as_items(value: Any) -> list[Any]:
    return cast(list[Any], value) if isinstance(value, list) else []


def text(value: Any, limit: int, default: str = "") -> str:
    out = str(value if value is not None else "").strip()
    return (out or default)[:limit]


def size_from_css(value: Any) -> str | None:
    match = PX.match(str(value or ""))
    if not match:
        return None
    number = float(match.group(1)) * (16 if match.group(2) in ("rem", "em") else 1)
    for limit, name in SIZE_STEPS:
        if number <= limit:
            return name
    return "xl"


def map_style(css: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    align = css.get("textAlign") or css.get("align")
    if align in ("left", "center", "right"):
        out["align"] = align
    size = size_from_css(css.get("fontSize"))
    if size:
        out["size"] = size
    if css.get("hidden") is True or css.get("display") == "none":
        out["hidden"] = True
    return out


def invert_overrides(cfg: dict[str, Any], responsive: dict[str, Any], keys: list[str]) -> tuple[dict, dict, dict]:
    mobile, tablet_v3, desktop_v3 = (responsive.get(k) or {} for k in ("mobile", "tablet", "desktop"))
    base = {k: mobile.get(k, cfg.get(k)) for k in keys if mobile.get(k, cfg.get(k)) is not None}
    tablet = {k: tablet_v3[k] if k in tablet_v3 else cfg.get(k) for k in keys if k in tablet_v3 or k in mobile}
    effective_tablet = {**base, **tablet}
    desktop = {
        k: desktop_v3[k] if k in desktop_v3 else cfg.get(k)
        for k in keys
        if k in desktop_v3 or effective_tablet.get(k) != cfg.get(k)
    }
    return base, tablet, desktop


def apply_presentation(element: dict[str, Any], cfg: dict[str, Any]) -> list[str]:
    notes: list[str] = []
    style_cfg = as_mapping(cfg.get("style"))
    responsive_cfg = as_mapping(cfg.get("responsive"))
    flat = map_style(style_cfg)
    per_device = {device: map_style(values) for device, values in responsive_cfg.items() if isinstance(values, dict)}
    keys = [*STYLE_KEYS, "hidden"]
    base, tablet, desktop = invert_overrides(flat, per_device, keys)
    style = {k: v for k, v in base.items() if k in STYLE_KEYS}
    if style:
        element["style"] = style
    if base.get("hidden"):
        element["hidden"] = True
    responsive: dict[str, Any] = {}
    for device, values in (("tablet", tablet), ("desktop", desktop)):
        override: dict[str, Any] = {}
        device_style = {k: v for k, v in values.items() if k in STYLE_KEYS}
        if device_style:
            override["style"] = device_style
        if "hidden" in values:
            override["hidden"] = bool(values["hidden"])
        if override:
            responsive[device] = override
    if responsive:
        element["responsive"] = responsive
    mapped_keys = {"textAlign", "align", "fontSize", "display", "hidden"}
    dropped = [k for k in style_cfg if k not in mapped_keys] + [
        k for values in responsive_cfg.values() if isinstance(values, dict) for k in values if k not in mapped_keys
    ]
    if dropped:
        notes.append("Custom styles were simplified")
    return notes


def heading(eid: str, value: Any, level: int = 1) -> dict[str, Any]:
    return {"id": eid, "type": "heading", "props": {"text": text(value, 140, "Welcome"), "level": level}}


def paragraph(eid: str, value: Any, preset: str = "body") -> dict[str, Any]:
    return {"id": eid, "type": "text", "props": {"text": text(value, 2000, "Text"), "preset": preset}}


def button_item(
    ids: IdRegistry, source: str, label: Any, action: dict[str, Any], variant: str = "primary"
) -> dict[str, Any]:
    return {"id": ids.make("it", source), "label": text(label, 40, "Continue"), "variant": variant, "action": action}


def options_of(ids: IdRegistry, bid: str, raw: Any) -> tuple[list[dict[str, Any]], dict[str, str]]:
    options: list[dict[str, Any]] = []
    lookup: dict[str, str] = {}
    for i, opt in enumerate(raw if isinstance(raw, list) else []):
        if isinstance(opt, dict):
            label = text(opt.get("label") or opt.get("value") or opt.get("text"), 100, f"Option {i + 1}")
            source = str(opt.get("id") or opt.get("value") or i)
            extra = {k: opt[k] for k in ("points",) if isinstance(opt.get(k), int)}
        else:
            label = text(opt, 100, f"Option {i + 1}")
            source = str(i)
            extra = {}
        oid = ids.make("opt", f"{bid}-{source}")
        options.append({"id": oid, "label": label, "value": export_slug(label), **extra})
        for alias in (
            label,
            opt.get("value") if isinstance(opt, dict) else None,
            opt.get("id") if isinstance(opt, dict) else None,
        ):
            if alias is not None:
                lookup[str(alias).strip().lower()] = oid
    return options, lookup


def field_kind(raw: Any) -> str:
    kind = str(raw or "text").strip().lower()
    kind = INPUT_KIND_ALIASES.get(kind, kind)
    return kind if kind in FIELD_KINDS else "text"


def convert_block(ids: IdRegistry, bid: str, hid: str, ntype: str, cfg: dict[str, Any], key_for: Any) -> Block:
    block = Block()
    eid = ids.make("el", bid)
    match ntype:
        case "text":
            block.elements.append(paragraph(eid, cfg.get("content") or cfg.get("text")))
        case "badge":
            block.elements.append(paragraph(eid, cfg.get("label") or "New", "eyebrow"))
        case "alert":
            block.elements.append(paragraph(eid, cfg.get("message") or cfg.get("label") or "Notice", "notice"))
        case "image":
            block.elements.append(
                {
                    "id": eid,
                    "type": "image",
                    "props": {"src": text(cfg.get("src"), 2048), "alt": text(cfg.get("alt"), 250)},
                }
            )
        case "video":
            url = text(cfg.get("url") or cfg.get("src"), 2048)
            kind = "youtube" if "youtu" in url else "vimeo" if "vimeo" in url else "file"
            block.elements.append({"id": eid, "type": "video", "props": {"source": {"kind": kind, "url": url}}})
            items = [button_item(ids, f"{bid}-watched", "Continue", {"kind": "next"})]
            skip = button_item(ids, f"{bid}-skipped", "Skip", {"kind": "goto", "skipValidation": True}, "link")
            buttons_id = ids.make("el", f"{bid}-actions")
            block.handles[f"{hid}:watched"] = ("next", None)
            block.handles[f"{hid}:skipped"] = (f"{buttons_id}:{skip['id']}", None)
            block.elements.append(
                {"id": buttons_id, "type": "buttons", "props": {"items": [*items, skip]}, "_deferred": True}
            )
        case "button":
            item = button_item(ids, bid, cfg.get("label"), {"kind": "next"})
            block.elements.append({"id": eid, "type": "buttons", "props": {"items": [item]}})
            block.handles[f"{hid}:default"] = ("item", item["id"])
        case "divider":
            block.elements.append({"id": eid, "type": "spacer", "props": {"size": "md", "line": True}})
        case "countdown":
            deadline = text(cfg.get("endTime") or cfg.get("deadline"), 40, "2030-01-01T00:00:00Z")
            block.elements.append({"id": eid, "type": "countdown", "props": {"deadline": deadline, "onExpire": "hide"}})
            if "timeoutSeconds" in cfg:
                block.notes.append("Timer duration was not carried over")
        case "card":
            card: dict[str, Any] = {"id": ids.make("it", f"{bid}-card"), "title": text(cfg.get("title"), 80, "Card")}
            if cfg.get("text"):
                card["text"] = text(cfg.get("text"), 300)
            if cfg.get("image"):
                card["image"] = text(cfg.get("image"), 2048)
            actions = as_items(cfg.get("actions"))
            label = cfg.get("ctaLabel") or (
                actions[0].get("label") if actions and isinstance(actions[0], dict) else None
            )
            if label:
                card["button"] = {"label": text(label, 40, "Choose"), "action": {"kind": "next"}}
                for i, action in enumerate(actions or [{}]):
                    handle = (
                        action.get("handle") if isinstance(action, dict) and action.get("handle") else f"action-{i}"
                    )
                    block.handles[f"{hid}:{handle}"] = ("item", card["id"])
                block.handles[f"{hid}:default"] = ("item", card["id"])
            block.elements.append({"id": eid, "type": "cards", "props": {"items": [card], "layout": "auto"}})
        case "hero_section":
            block.media = (
                {
                    "src": text(cfg.get("image"), 2048),
                    "side": "left" if cfg.get("imagePosition") == "left" else "right",
                }
                if cfg.get("image")
                else None
            )
            block.elements.append(heading(ids.make("el", f"{bid}-h"), cfg.get("headline")))
            if cfg.get("subheadline"):
                block.elements.append(paragraph(ids.make("el", f"{bid}-t"), cfg.get("subheadline"), "lead"))
            ctas = as_items(cfg.get("ctas"))
            items = []
            for i, cta in enumerate(ctas):
                if not isinstance(cta, dict):
                    continue
                handle = cta.get("handle") or f"cta-{i}"
                item = button_item(
                    ids, f"{bid}-{handle}", cta.get("label"), {"kind": "next"}, "primary" if i == 0 else "secondary"
                )
                items.append(item)
                block.handles[f"{hid}:{handle}"] = ("item", item["id"])
            if items:
                block.elements.append(
                    {"id": ids.make("el", f"{bid}-b"), "type": "buttons", "props": {"items": items[:3]}}
                )
        case "quiz" | "select":
            key = key_for(cfg.get("blockKey"), cfg.get("question") or cfg.get("label") or ntype)
            options, lookup = options_of(ids, bid, cfg.get("options"))
            scoring = "points" if cfg.get("scoring") == "points" or any("points" in o for o in options) else "none"
            props: dict[str, Any] = {
                "question": text(cfg.get("question") or cfg.get("label"), 200, "Choose one"),
                "key": key,
                "multiple": bool(cfg.get("multiple")) or cfg.get("type") == "multi",
                "display": "dropdown" if ntype == "select" else "list",
                "options": options,
                "scoring": scoring,
                "required": bool(cfg.get("required", True)),
            }
            block.elements.append({"id": eid, "type": "choice", "props": props})
            block.answers.append(Answer(key, "choices" if props["multiple"] else "choice", lookup))
            if ntype == "quiz":
                block.handles[f"{hid}:answered"] = ("auto", eid)
                skip = button_item(ids, f"{bid}-skip", "Skip", {"kind": "goto", "skipValidation": True}, "link")
                buttons_id = ids.make("el", f"{bid}-skip")
                block.handles[f"{hid}:skipped"] = (f"{buttons_id}:{skip['id']}", None)
                block.elements.append(
                    {"id": buttons_id, "type": "buttons", "props": {"items": [skip]}, "_deferred": True}
                )
        case "rating":
            key = key_for(cfg.get("blockKey"), cfg.get("question") or "rating")
            top = cfg.get("max") if isinstance(cfg.get("max"), int) and 3 <= cfg.get("max", 0) <= 10 else 5
            block.elements.append(
                {
                    "id": eid,
                    "type": "rating",
                    "props": {
                        "question": text(cfg.get("question") or cfg.get("label"), 200, "How was it?"),
                        "key": key,
                        "scale": "stars",
                        "max": top,
                    },
                }
            )
            block.answers.append(Answer(key, "rating"))
        case "input":
            key = key_for(cfg.get("blockKey"), cfg.get("label") or "answer")
            kind = field_kind(cfg.get("type"))
            block.form_fields.append(
                {
                    "id": ids.make("fld", bid),
                    "kind": kind,
                    "label": text(cfg.get("label"), 80, "Your answer"),
                    "key": key,
                    "placeholder": text(cfg.get("placeholder"), 80) or None,
                    "required": bool(cfg.get("required", False)),
                    "unique": bool(cfg.get("checkUniqueness", False)) and kind in ("email", "phone"),
                }
            )
            block.answers.append(Answer(key, kind))
        case "checkbox":
            key = key_for(cfg.get("blockKey"), cfg.get("label") or "consent")
            block.form_fields.append(
                {
                    "id": ids.make("fld", bid),
                    "kind": "consent",
                    "label": text(cfg.get("label"), 80, "I agree"),
                    "key": key,
                    "required": bool(cfg.get("required", False)),
                    "consentText": text(cfg.get("label"), 500, "I agree") or None,
                }
            )
            block.answers.append(Answer(key, "boolean"))
        case "form":
            for i, f in enumerate(as_items(cfg.get("fields"))):
                if not isinstance(f, dict):
                    continue
                label = text(f.get("label"), 80, "Field")
                key = key_for(f.get("key") or f.get("blockKey"), label)
                kind = field_kind(f.get("type"))
                block.form_fields.append(
                    {
                        "id": ids.make("fld", f"{bid}-{f.get('id') or i}"),
                        "kind": kind,
                        "label": label,
                        "key": key,
                        "required": bool(f.get("required", False)),
                    }
                )
                block.answers.append(Answer(key, kind))
        case "trigger" | "condition" | "end" | "ask_ai":
            return block
        case _:
            block.elements.append(paragraph(eid, cfg.get("content") or cfg.get("label") or ntype))
            block.notes.append(f"A {ntype} block was simplified")
    for element in block.elements:
        if element["type"] in ("text", "heading", "image") and not element.get("_deferred"):
            block.notes.extend(apply_presentation(element, cfg))
            break
    visible = cfg.get("blockVisibleWhen")
    if isinstance(visible, dict) and visible.get("field"):
        for element in block.elements:
            element["_visible"] = visible
    return block
