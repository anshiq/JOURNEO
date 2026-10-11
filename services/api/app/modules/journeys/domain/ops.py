import copy
import re
import unicodedata
from typing import Any

from app.modules.journeys.domain.ids import IdGen, IdKind
from app.modules.journeys.domain.rules.answers import RESERVED

ITEM_KINDS: dict[str, tuple[str, IdKind]] = {
    "buttons": ("items", "it"),
    "cards": ("items", "it"),
    "choice": ("options", "opt"),
    "form": ("fields", "fld"),
    "rating": ("bands", "band"),
}


def ascii_fold(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text)
    return "".join(c for c in decomposed if not unicodedata.combining(c))


def slugify_key(label: str, existing: set[str]) -> str:
    base = re.sub(r"[^a-z0-9]+", "_", ascii_fold(label.strip().lower())).strip("_") or "answer"
    if not base[0].isalpha():
        base = f"a_{base}"
    if base in RESERVED or base.startswith(("utm_", "param")):
        base = f"{base}_answer"
    base = base[:40].rstrip("_")
    candidate = base
    n = 2
    while candidate in existing:
        suffix = f"_{n}"
        candidate = base[: 40 - len(suffix)] + suffix
        n += 1
    existing.add(candidate)
    return candidate


def export_slug(label: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", ascii_fold(label.strip().lower())).strip("-")[:60] or "option"


def existing_keys(doc: dict[str, Any]) -> set[str]:
    keys: set[str] = set()
    for screen in (doc.get("screens") or {}).values():
        for el in screen.get("elements", []):
            props = el.get("props", {})
            if el.get("type") in ("choice", "rating") and props.get("key"):
                keys.add(props["key"])
            if el.get("type") == "form":
                keys.update(f["key"] for f in props.get("fields", []) if f.get("key"))
    return keys


def instantiate_element(fragment: dict[str, Any], ids: IdGen, keys: set[str]) -> dict[str, Any]:
    el = copy.deepcopy(fragment)
    el.pop("id", None)
    el["id"] = ids("el")
    props = el.setdefault("props", {})
    etype = el.get("type", "")
    if etype in ITEM_KINDS:
        attr, kind = ITEM_KINDS[etype]
        for item in props.get(attr) or []:
            item["id"] = ids(kind)
    if etype == "choice":
        props["key"] = slugify_key(props.get("key") or props.get("question") or "choice", keys)
        for opt in props.get("options", []):
            opt.setdefault("value", export_slug(opt.get("label", "option")))
    elif etype == "rating":
        props["key"] = slugify_key(props.get("key") or props.get("question") or "rating", keys)
    elif etype == "form":
        for field in props.get("fields", []):
            field["key"] = slugify_key(field.get("key") or field.get("label") or field.get("kind", "field"), keys)
    return el


def instantiate_screen(recipe: dict[str, Any], ids: IdGen, keys: set[str], name: str | None = None) -> dict[str, Any]:
    screen_id = ids("scr")
    screen: dict[str, Any] = {
        "id": screen_id,
        "name": (name or recipe.get("name") or "Screen")[:60],
        "layout": copy.deepcopy(recipe.get("layout") or {"preset": "stack"}),
        "elements": [instantiate_element(e, ids, keys) for e in recipe.get("elements", [])],
    }
    for key in ("background", "colorScheme", "stickyAction", "showAssistant", "allowBack"):
        if key in recipe:
            screen[key] = copy.deepcopy(recipe[key])
    return screen


def remove_links_with_prefix(links: dict[str, dict[str, str]], step_id: str, prefix: str) -> list[str]:
    ports = links.get(step_id, {})
    removed = [p for p in ports if p.startswith(prefix)]
    for p in removed:
        del ports[p]
    return removed
