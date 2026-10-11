import copy
import itertools
from collections import defaultdict
from typing import Any, cast

from app.modules.journeys.domain.ids import IdGen, sequential_ids
from app.modules.journeys.domain.ops import instantiate_screen

NEXT_ACTIONS = ("next",)


def _has_exit(screen: dict[str, Any]) -> bool:
    for el in screen["elements"]:
        props = el.get("props", {})
        if el["type"] == "buttons" and props.get("items"):
            return True
        if el["type"] == "form":
            return True
        if el["type"] == "choice" and props.get("autoAdvance") and not props.get("multiple"):
            return True
        if el["type"] == "cards" and any(i.get("button") for i in props.get("items", [])):
            return True
    return False


def _dangling(port: str, action: dict[str, Any] | None, linked: dict[str, str]) -> bool:
    kind = (action or {}).get("kind")
    if kind == "next":
        return "next" not in linked
    if kind == "goto":
        return port not in linked
    return False


def _close_exits(screen: dict[str, Any], linked: dict[str, str]) -> None:
    for el in screen["elements"]:
        props = el.get("props", {})
        if el["type"] == "buttons":
            props["items"] = [
                i for i in props.get("items", []) if not _dangling(f"{el['id']}:{i['id']}", i.get("action"), linked)
            ]
        if el["type"] == "cards":
            for item in props.get("items", []):
                button = item.get("button")
                if button and _dangling(f"{el['id']}:{item['id']}", button.get("action"), linked):
                    item.pop("button", None)
        if el["type"] == "choice" and props.get("autoAdvance") and "next" not in linked:
            props["autoAdvance"] = False
    screen["elements"] = [
        el for el in screen["elements"] if not (el["type"] == "buttons" and not el.get("props", {}).get("items"))
    ]


def _continue_button(ids: IdGen, label: str = "Continue") -> dict[str, Any]:
    return {
        "id": ids("el"),
        "type": "buttons",
        "props": {"items": [{"id": ids("it"), "label": label, "variant": "primary", "action": {"kind": "next"}}]},
    }


def _find_item(screen: dict[str, Any], label: str) -> tuple[dict[str, Any], dict[str, Any]] | None:
    wanted = label.strip().lower()
    for el in screen["elements"]:
        if el["type"] == "buttons":
            for item in el["props"].get("items", []):
                if item.get("label", "").strip().lower() == wanted:
                    return el, item
        if el["type"] == "cards":
            for item in el["props"].get("items", []):
                button = item.get("button")
                titles = {item.get("title", "").strip().lower(), (button or {}).get("label", "").strip().lower()}
                if button and wanted in titles:
                    return el, item
    return None


def as_values(value: Any) -> list[str]:
    items = cast(list[Any], value) if isinstance(value, list) else [value]
    return [str(v) for v in items if v is not None]


def _choice_for(screen: dict[str, Any], answer: str) -> dict[str, Any] | None:
    for el in screen["elements"]:
        if el["type"] == "choice" and el["props"].get("key") == answer:
            return el
    return None


def _option_ids(choice: dict[str, Any], values: list[str]) -> list[str]:
    out: list[str] = []
    for value in values:
        wanted = str(value).strip().lower()
        for opt in choice["props"].get("options", []):
            if wanted in (opt.get("label", "").strip().lower(), str(opt.get("value", "")).lower(), opt["id"]):
                out.append(opt["id"])
                break
    return out


def compose(
    spec: dict[str, Any], ids: IdGen | None = None, recipes: dict[str, dict[str, Any]] | None = None
) -> dict[str, Any]:
    gen = ids or sequential_ids()
    library = recipes or {}
    keys: set[str] = set()
    start_id = gen("stp")
    steps: list[dict[str, Any]] = [{"id": start_id, "kind": "start"}]
    links: dict[str, dict[str, str]] = {}
    screens: dict[str, dict[str, Any]] = {}
    by_title: dict[str, str] = {}
    order: list[str] = []
    terminal: set[str] = set()
    for entry in spec.get("screens", []):
        recipe = copy.deepcopy(library.get(entry.get("recipe", ""), {}))
        if entry.get("elements"):
            recipe["elements"] = entry["elements"]
        if entry.get("layout"):
            recipe["layout"] = entry["layout"]
        title = str(entry.get("title") or recipe.get("name") or "Screen")
        screen = instantiate_screen(recipe, gen, keys, name=title)
        if entry.get("ends"):
            terminal.add(screen["id"])
        screens[screen["id"]] = screen
        by_title.setdefault(title.strip().lower(), screen["id"])
        order.append(screen["id"])
        steps.append({"id": screen["id"], "kind": "screen"})
    if order:
        links[start_id] = {"next": order[0]}
    for current, following in itertools.pairwise(order):
        if current in terminal:
            continue
        links.setdefault(current, {})["next"] = following
    for sid in order:
        if sid not in terminal and sid in links and not _has_exit(screens[sid]):
            screens[sid]["elements"].append(_continue_button(gen))

    def lookup(title: Any) -> str | None:
        return by_title.get(str(title or "").strip().lower())

    for goto in spec.get("gotos", []):
        src, dst = lookup(goto.get("from")), lookup(goto.get("to"))
        if not src or not dst:
            continue
        found = _find_item(screens[src], str(goto.get("item", "")))
        if found is None:
            continue
        el, item = found
        action = {"kind": "goto"}
        if el["type"] == "cards":
            item["button"]["action"] = action
        else:
            item["action"] = action
        links.setdefault(src, {})[f"{el['id']}:{item['id']}"] = dst
    for sid in terminal:
        _close_exits(screens[sid], links.get(sid, {}))

    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for branch in spec.get("branches", []):
        after = lookup(branch.get("after"))
        if after:
            grouped[after].append(branch)
    for after, branches in grouped.items():
        _apply_branches(after, branches, screens, steps, links, lookup, gen)

    for redirect in spec.get("redirects", []):
        after = lookup(redirect.get("after"))
        url = str(redirect.get("url", ""))
        if after and url:
            rid = gen("stp")
            steps.append({"id": rid, "kind": "redirect", "url": url[:2048], "passParams": True, "delayMs": 0})
            links.setdefault(after, {})["next"] = rid
            if not _has_exit(screens[after]):
                screens[after]["elements"].append(_continue_button(gen))

    doc: dict[str, Any] = {
        "schemaVersion": 4,
        "theme": copy.deepcopy(spec.get("theme") or {}),
        "screens": screens,
        "steps": steps,
        "links": links,
        "settings": {"progress": "bar", "allowBack": False},
    }
    if spec.get("assistant"):
        doc["assistant"] = copy.deepcopy(spec["assistant"])
    return doc


def _apply_branches(
    after: str,
    branches: list[dict[str, Any]],
    screens: dict[str, dict[str, Any]],
    steps: list[dict[str, Any]],
    links: dict[str, dict[str, str]],
    lookup: Any,
    gen: IdGen,
) -> None:
    screen = screens[after]
    answers = {str(b.get("answer") or "") for b in branches}
    choice = _choice_for(screen, next(iter(answers))) if len(answers) == 1 else None
    simple = (
        choice is not None
        and not choice["props"].get("multiple")
        and all(b.get("op", "is") in ("is", "equals", "anyOf") for b in branches)
    )
    if simple and choice is not None:
        choice["props"]["branchByAnswer"] = True
        for branch in branches:
            dst = lookup(branch.get("to"))
            values = branch.get("value")
            for oid in _option_ids(choice, as_values(values)):
                if dst:
                    links.setdefault(after, {})[f"{choice['id']}:opt:{oid}"] = dst
        if not _has_exit(screen):
            screen["elements"].append(_continue_button(gen))
        return
    cid = gen("stp")
    rules: list[dict[str, Any]] = []
    cond_links: dict[str, str] = {}
    for branch in branches:
        dst = lookup(branch.get("to"))
        if not dst:
            continue
        rule_id = gen("rule")
        op = branch.get("op", "equals")
        when: dict[str, Any] = {"op": op, "answer": branch.get("answer", "")}
        source = None
        for candidate in screens.values():
            source = _choice_for(candidate, str(branch.get("answer", ""))) or source
        values = branch.get("value")
        if source is not None:
            when["op"] = "includesAny" if source["props"].get("multiple") else "anyOf"
            when["value"] = _option_ids(source, as_values(values))
        elif op in ("eq", "neq", "gt", "gte", "lt", "lte", "between"):
            when["value"] = (
                float(values)
                if isinstance(values, int | float | str) and str(values).replace(".", "", 1).isdigit()
                else 0
            )
        elif values is not None:
            when["value"] = str(values)
        rules.append(
            {"id": rule_id, "label": str(branch.get("label") or branch.get("to") or "Path")[:60], "when": when}
        )
        cond_links[f"rule:{rule_id}"] = dst
    if not rules:
        return
    previous_next = links.get(after, {}).get("next")
    if previous_next:
        cond_links["else"] = previous_next
    steps.append({"id": cid, "kind": "condition", "rules": rules})
    links[cid] = cond_links
    links.setdefault(after, {})["next"] = cid
    if not _has_exit(screen):
        screen["elements"].append(_continue_button(gen))
