import copy
import re
from collections.abc import Callable
from typing import Any

from app.modules.journeys.domain.ops import slugify_key
from app.modules.journeys.domain.rules.model import Issue, Target, TargetKind, warning
from app.modules.journeys.upgraders import IdRegistry
from app.modules.journeys.upgraders.v3_elements import Answer, convert_block, heading, paragraph, text

CURRENT = 4
HEX = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
NUMERIC_OPS = {"eq": "eq", "neq": "neq", "gt": "gt", "gte": "gte", "lt": "lt", "lte": "lte"}
TEXT_OPS = {"eq": "equals", "neq": "notEquals", "contains": "contains"}

Upgrader = Callable[[dict[str, Any]], tuple[dict[str, Any], list[Issue]]]


def blank_doc() -> dict[str, Any]:
    return {
        "schemaVersion": 4,
        "theme": {},
        "screens": {
            "scr_welcome": {
                "id": "scr_welcome",
                "name": "Welcome",
                "layout": {"preset": "stack"},
                "elements": [
                    {"id": "el_welcome1", "type": "heading", "props": {"text": "Welcome", "level": 1}},
                ],
            }
        },
        "steps": [{"id": "stp_start", "kind": "start"}, {"id": "scr_welcome", "kind": "screen"}],
        "links": {"stp_start": {"next": "scr_welcome"}},
        "settings": {"progress": "bar", "allowBack": False},
    }


def migrated(
    message: str, kind: TargetKind = "settings", target_id: str = "doc", screen_id: str | None = None
) -> Issue:
    return warning("W_MIGRATED", message, Target(kind=kind, id=target_id, screen_id=screen_id), "select")


def ensure_current(raw: Any) -> tuple[dict[str, Any], list[Issue]]:
    if not isinstance(raw, dict) or not raw:
        return blank_doc(), [migrated("The journey was empty and has been replaced with a starter screen")]
    version = raw.get("schemaVersion", raw.get("schema_version", 3 if "nodes" in raw else None))
    if version == CURRENT:
        return raw, []
    upgrader = UPGRADERS.get(version) if isinstance(version, int) else None
    if upgrader is None:
        return blank_doc(), [migrated("The journey format was not recognised and has been replaced")]
    doc, issues = upgrader(raw)
    if doc.get("schemaVersion") != CURRENT:
        more, extra = ensure_current(doc)
        return more, issues + extra
    return doc, issues


def v3_to_v4(root: dict[str, Any]) -> tuple[dict[str, Any], list[Issue]]:
    try:
        return Converter(root).run()
    except Exception:
        return blank_doc(), [migrated("This journey could not be converted automatically and was replaced")]


UPGRADERS: dict[int, Upgrader] = {3: v3_to_v4}


def as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


class Converter:
    def __init__(self, root: dict[str, Any]) -> None:
        self.root = root
        self.ids = IdRegistry()
        self.issues: list[Issue] = []
        self.keys: set[str] = set()
        self.key_map: dict[str, str] = {}
        self.answers: dict[str, Answer] = {}
        self.nodes = {str(n["id"]): n for n in as_list(root.get("nodes")) if isinstance(n, dict) and n.get("id")}
        self.screens_v3 = [s for s in as_list(root.get("screens")) if isinstance(s, dict) and s.get("id")]
        self.edges = [e for e in as_list(root.get("edges")) if isinstance(e, dict)]
        self.steps: list[dict[str, Any]] = []
        self.screens: dict[str, dict[str, Any]] = {}
        self.links: dict[str, dict[str, str]] = {}
        self.screen_ids: dict[str, str] = {}
        self.terminals: dict[str, str] = {}
        self.conditions: dict[str, str] = {}
        self.visibility: list[tuple[dict[str, Any], dict[str, Any], str]] = []

    def key_for(self, raw: Any, label: Any) -> str:
        source = str(raw or "").strip()
        if source and source in self.key_map:
            return slugify_key(source, self.keys)
        key = slugify_key(source or str(label or "answer"), self.keys)
        if source:
            self.key_map.setdefault(source, key)
        self.key_map.setdefault(key, key)
        return key

    def run(self) -> tuple[dict[str, Any], list[Issue]]:
        start_id = self.ids.make("stp", "start")
        self.steps.append({"id": start_id, "kind": "start"})
        for screen in self.screens_v3:
            sid = self.ids.make("scr", str(screen["id"]))
            self.screen_ids[str(screen["id"])] = sid
            self.steps.append({"id": sid, "kind": "screen"})
        for nid, node in self.nodes.items():
            if node.get("type") == "condition":
                cid = self.ids.make("stp", nid)
                self.conditions[nid] = cid
        usage: dict[str, int] = {}
        for index, screen in enumerate(self.screens_v3):
            self.build_screen(screen, index, usage)
        self.build_conditions()
        self.apply_visibility()
        self.link_start(start_id)
        if not self.screens:
            return blank_doc(), [*self.issues, migrated("The journey had no screens and was replaced")]
        self.report_orphans(usage)
        doc: dict[str, Any] = {
            "schemaVersion": 4,
            "theme": self.theme(),
            "screens": self.screens,
            "steps": self.steps,
            "links": {k: v for k, v in self.links.items() if v},
            "settings": {"progress": "bar", "allowBack": False},
        }
        assistant = self.assistant()
        if assistant is not None:
            doc["assistant"] = assistant
            for screen in self.screens.values():
                screen["showAssistant"] = True
        return doc, self.issues

    def target_of(self, node_id: str, source: str) -> str | None:
        if node_id in self.screen_ids:
            return self.screen_ids[node_id]
        if node_id in self.conditions:
            return self.conditions[node_id]
        node = self.nodes.get(node_id)
        if node is None:
            self.issues.append(migrated("A connection pointed to something that no longer exists", "step", source))
            return None
        if node.get("type") == "end":
            return self.terminal(node_id, as_dict(node.get("config")))
        if node.get("type") == "trigger":
            self.issues.append(migrated("A connection back to the start was removed", "step", source))
            return None
        self.issues.append(migrated("A connection to a block was removed", "step", source))
        return None

    def terminal(self, node_id: str, cfg: dict[str, Any]) -> str:
        if node_id in self.terminals:
            return self.terminals[node_id]
        url = text(cfg.get("redirectUrl"), 2048)
        if url:
            rid = self.ids.make("stp", f"redirect-{node_id}")
            delay = cfg.get("redirectDelayMs")
            self.steps.append(
                {
                    "id": rid,
                    "kind": "redirect",
                    "url": url,
                    "passParams": True,
                    "delayMs": max(0, min(int(delay), 10000)) if isinstance(delay, int | float) else 0,
                }
            )
            self.terminals[node_id] = rid
            return rid
        sid = self.ids.make("scr", f"end-{node_id}")
        self.screens[sid] = {
            "id": sid,
            "name": "Thank you",
            "layout": {"preset": "stack", "vAlign": "center", "hAlign": "center"},
            "elements": [
                heading(self.ids.make("el", f"{node_id}-h"), "Thank you"),
                paragraph(self.ids.make("el", f"{node_id}-t"), cfg.get("message") or "Thanks for visiting."),
            ],
        }
        self.steps.append({"id": sid, "kind": "screen"})
        self.terminals[node_id] = sid
        return sid

    def build_screen(self, screen: dict[str, Any], index: int, usage: dict[str, int]) -> None:
        v3_id = str(screen["id"])
        sid = self.screen_ids[v3_id]
        elements: list[dict[str, Any]] = []
        deferred: list[dict[str, Any]] = []
        handles: dict[str, tuple[str, str | None]] = {}
        form_fields: list[dict[str, Any]] = []
        form_at: int | None = None
        media: dict[str, Any] | None = None
        notes: list[str] = []
        for bid in as_list(screen.get("blocks")):
            node = self.nodes.get(str(bid))
            if node is None:
                self.issues.append(migrated(f"Block {bid} no longer existed and was dropped", "screen", sid))
                continue
            count = usage.get(str(bid), 0)
            usage[str(bid)] = count + 1
            source = str(bid) if count == 0 else f"{bid}-{index}"
            block = convert_block(
                self.ids, source, str(bid), str(node.get("type")), as_dict(node.get("config")), self.key_for
            )
            for answer in block.answers:
                self.answers.setdefault(answer.key, answer)
            handles.update(block.handles)
            notes.extend(block.notes)
            if block.media and media is None:
                media = block.media
            if block.form_fields:
                if form_at is None:
                    form_at = len(elements)
                form_fields.extend(block.form_fields)
            for element in block.elements:
                (deferred if element.pop("_deferred", False) else elements).append(element)
        advance = as_dict(screen.get("advance"))
        mode = advance.get("mode", "button")
        label = text(advance.get("label") or as_dict(self.root.get("theme")).get("cta"), 40, "Continue")
        if form_fields:
            form = {
                "id": self.ids.make("el", f"{v3_id}-form"),
                "type": "form",
                "props": {
                    "fields": [{k: v for k, v in f.items() if v is not None} for f in form_fields],
                    "submitLabel": label,
                },
            }
            elements.insert(form_at or 0, form)
        out: dict[str, Any] = {
            "id": sid,
            "name": text(screen.get("name"), 60, f"Screen {index + 1}"),
            "layout": {"preset": "stack"},
            "elements": elements,
        }
        if media:
            out["layout"] = {
                "preset": "split",
                "media": {"kind": "image", "src": media["src"], "alt": "", "side": media["side"]},
            }
        if as_dict(screen.get("back")).get("show"):
            out["allowBack"] = True
        if screen.get("timeoutSeconds"):
            self.issues.append(migrated("The screen timer was removed", "screen", sid))
        for note in dict.fromkeys(notes):
            self.issues.append(migrated(note, "screen", sid))
        self.screens[sid] = out
        self.link_screen(screen, sid, handles, deferred, mode, label)

    def link_screen(
        self,
        screen: dict[str, Any],
        sid: str,
        handles: dict[str, tuple[str, str | None]],
        deferred: list[dict[str, Any]],
        mode: str,
        label: str,
    ) -> None:
        out = self.screens[sid]
        advance_handle = as_dict(screen.get("advance")).get("handle") or "default"
        ports: dict[str, str] = {}
        used_deferred: set[str] = set()
        for edge in self.edges:
            if str(edge.get("source")) != str(screen["id"]):
                continue
            handle = edge.get("sourceHandle")
            target = self.target_of(str(edge.get("target", "")), sid)
            if target is None:
                continue
            port = self.port_for(
                out,
                str(handle) if handle not in (None, "") else "default",
                advance_handle,
                handles,
                deferred,
                used_deferred,
                sid,
            )
            if port is None:
                continue
            if port in ports:
                if ports[port] != target:
                    self.issues.append(
                        migrated("Two connections used the same exit, the first one was kept", "screen", sid)
                    )
                continue
            ports[port] = target
        for element in deferred:
            if element["id"] in used_deferred:
                element["props"]["items"] = [
                    i
                    for i in element["props"]["items"]
                    if i["action"]["kind"] != "goto" or f"{element['id']}:{i['id']}" in ports
                ]
                out["elements"].append(element)
        if ports:
            self.links[sid] = ports
        if "next" in ports and not self.has_next(out):
            if mode == "none":
                self.issues.append(migrated("A Continue button was added so visitors can move on", "screen", sid))
            out["elements"].append(
                {
                    "id": self.ids.make("el", f"{screen['id']}-next"),
                    "type": "buttons",
                    "props": {
                        "items": [
                            {
                                "id": self.ids.make("it", f"{screen['id']}-next"),
                                "label": label,
                                "variant": "primary",
                                "action": {"kind": "next"},
                            }
                        ]
                    },
                }
            )

    def port_for(
        self,
        screen: dict[str, Any],
        handle: str,
        advance_handle: str,
        handles: dict[str, tuple[str, str | None]],
        deferred: list[dict[str, Any]],
        used_deferred: set[str],
        sid: str,
    ) -> str | None:
        if handle in ("default", advance_handle, "None"):
            return "next"
        mapped = handles.get(handle)
        if mapped is None:
            self.issues.append(migrated(f"The exit ‘{handle}’ could not be carried over", "screen", sid))
            return None
        kind, ref = mapped
        if kind == "next":
            for element in deferred:
                if any(i["action"]["kind"] == "next" for i in element["props"]["items"]):
                    used_deferred.add(element["id"])
            return "next"
        if kind == "auto":
            for element in screen["elements"]:
                if element["id"] == ref and element["type"] == "choice" and not element["props"].get("multiple"):
                    element["props"]["autoAdvance"] = True
            return "next"
        if kind == "item":
            for element in screen["elements"]:
                for item in element.get("props", {}).get("items", []):
                    if item.get("id") == ref:
                        if element["type"] == "cards":
                            item["button"]["action"] = {"kind": "goto"}
                        else:
                            item["action"] = {"kind": "goto"}
                        return f"{element['id']}:{ref}"
            return None
        element_id = kind.split(":", 1)[0]
        used_deferred.add(element_id)
        return kind

    def has_next(self, screen: dict[str, Any]) -> bool:
        for element in screen["elements"]:
            props = element.get("props", {})
            if element["type"] == "form":
                return True
            if element["type"] == "choice" and props.get("autoAdvance"):
                return True
            if element["type"] == "buttons" and any(i["action"]["kind"] == "next" for i in props.get("items", [])):
                return True
            if element["type"] == "cards" and any(
                (i.get("button") or {}).get("action", {}).get("kind") == "next" for i in props.get("items", [])
            ):
                return True
        return False

    def build_conditions(self) -> None:
        for nid, cid in self.conditions.items():
            cfg = as_dict(self.nodes[nid].get("config"))
            field = str(cfg.get("field") or "")
            branches = [b for b in as_list(cfg.get("branches")) if isinstance(b, dict)]
            if not branches and (cfg.get("operator") or cfg.get("value") is not None):
                branches = [{"handle": "true", "operator": cfg.get("operator", "eq"), "value": cfg.get("value")}]
            else_handles = {str(cfg.get("elseHandle") or "else"), "false"}
            rules: list[dict[str, Any]] = []
            by_handle: dict[str, str] = {}
            for branch in branches:
                handle = str(branch.get("handle") or f"rule{len(rules) + 1}")
                if handle in by_handle:
                    self.issues.append(migrated("A duplicate condition path was removed", "step", cid))
                    continue
                rid = self.ids.make("rule", f"{nid}-{handle}")
                by_handle[handle] = rid
                when = self.coerce(
                    field, str(branch.get("operator") or cfg.get("operator") or "eq"), branch.get("value"), cid
                )
                rules.append(
                    {
                        "id": rid,
                        "label": text(handle.replace("_", " ").replace("-", " ").capitalize(), 60, "Path"),
                        "when": when,
                    }
                )
            self.steps.append({"id": cid, "kind": "condition", "rules": rules[:10]})
            ports: dict[str, str] = {}
            for edge in self.edges:
                if str(edge.get("source")) != nid:
                    continue
                handle = str(edge.get("sourceHandle") or "")
                target = self.target_of(str(edge.get("target", "")), cid)
                if target is None:
                    continue
                if handle in by_handle:
                    port = f"rule:{by_handle[handle]}"
                elif handle in else_handles:
                    port = "else"
                else:
                    self.issues.append(migrated(f"The path ‘{handle}’ could not be carried over", "step", cid))
                    continue
                ports.setdefault(port, target)
            if ports:
                self.links[cid] = ports
            self.issues.append(migrated("Check that this condition still matches your intent", "step", cid))

    def coerce(self, field: str, op: str, value: Any, owner: str) -> dict[str, Any]:
        key = self.key_map.get(field, field)
        answer = self.answers.get(key)
        raw = "" if value is None else str(value)
        if field.startswith("utm_"):
            return {"op": TEXT_OPS.get(op, "equals"), "answer": field[:40], "value": raw[:250]}
        if answer is None:
            self.issues.append(migrated(f"The rule uses ‘{field}’, which is not a saved answer", "step", owner))
            return {"op": "equals", "answer": (key or "answer")[:40], "value": raw[:250]}
        if answer.type in ("choice", "choices"):
            option = answer.options.get(raw.strip().lower())
            multi = answer.type == "choices"
            mapped = {"neq": "includesNone" if multi else "noneOf"}.get(op, "includesAny" if multi else "anyOf")
            if option is None:
                self.issues.append(migrated(f"The value ‘{raw}’ did not match an option", "step", owner))
            return {"op": mapped, "answer": key, "value": [option] if option else []}
        if answer.type in ("rating", "number"):
            try:
                number = float(raw)
            except ValueError:
                number = 0.0
            return {"op": NUMERIC_OPS.get(op, "eq"), "answer": key, "value": number}
        if answer.type == "boolean":
            truthy = raw.strip().lower() in ("true", "1", "yes", "on")
            positive = truthy if op != "neq" else not truthy
            return {"op": "isTrue" if positive else "isFalse", "answer": key}
        if answer.type == "date":
            return {"op": "after" if op in ("gt", "gte") else "before", "answer": key, "value": raw[:40]}
        if op not in TEXT_OPS:
            self.issues.append(migrated("A number comparison on a text answer was changed to ‘is’", "step", owner))
        return {"op": TEXT_OPS.get(op, "equals"), "answer": key, "value": raw[:250]}

    def apply_visibility(self) -> None:
        for screen in self.screens.values():
            for element in screen["elements"]:
                rule = element.pop("_visible", None)
                if isinstance(rule, dict):
                    element["visibleIf"] = self.coerce(
                        str(rule.get("field")), str(rule.get("operator") or "eq"), rule.get("value"), screen["id"]
                    )

    def link_start(self, start_id: str) -> None:
        triggers = [nid for nid, n in self.nodes.items() if n.get("type") == "trigger"]
        if len(triggers) > 1:
            self.issues.append(
                migrated("The journey had more than one start, the first one was kept", "step", start_id)
            )
        target = None
        for edge in self.edges:
            if str(edge.get("source")) in triggers[:1]:
                target = self.target_of(str(edge.get("target", "")), start_id)
                if target:
                    break
        if target is None and self.screens_v3:
            target = self.screen_ids[str(self.screens_v3[0]["id"])]
            if not triggers:
                self.issues.append(
                    migrated("The journey had no start, it now begins at the first screen", "step", start_id)
                )
        if target:
            self.links[start_id] = {"next": target}

    def report_orphans(self, usage: dict[str, int]) -> None:
        for nid, node in self.nodes.items():
            if node.get("type") in ("trigger", "condition", "end", "ask_ai") or nid in usage:
                continue
            self.issues.append(migrated(f"An unused {node.get('type')} block was removed"))

    def theme(self) -> dict[str, Any]:
        v3 = as_dict(self.root.get("theme"))
        colors: dict[str, str] = {}
        for src, dst in (
            ("primary", "primary"),
            ("accent", "accent"),
            ("surface", "surface"),
            ("foreground", "text"),
            ("background", "background"),
        ):
            value = v3.get(src)
            if isinstance(value, str) and HEX.match(value):
                colors[dst] = value
        theme: dict[str, Any] = {"colors": colors}
        radius = v3.get("radius")
        if isinstance(radius, int | float):
            theme["radius"] = (
                "none"
                if radius <= 0
                else "sm"
                if radius <= 6
                else "md"
                if radius <= 12
                else "lg"
                if radius <= 20
                else "full"
            )
        font = str(v3.get("font") or "").lower()
        theme["fonts"] = {"pairing": "editorial" if "serif" in font and "sans" not in font else "classic"}
        return theme

    def assistant(self) -> dict[str, Any] | None:
        runtime = as_dict(self.root.get("askAi"))
        node = next((as_dict(n.get("config")) for n in self.nodes.values() if n.get("type") == "ask_ai"), None)
        if not runtime and node is None:
            return None
        merged = {**(node or {}), **runtime}
        suggested = [text(q, 120) for q in as_list((node or {}).get("suggestedQuestions")) if text(q, 120)]
        return copy.deepcopy(
            {
                "greeting": text(merged.get("greeting"), 200, "Questions? Ask me anything."),
                "placeholder": text(merged.get("placeholder"), 80, "Ask a question"),
                "suggested": suggested[:6],
                "fallback": text(merged.get("refusalMessage"), 300, "I could not find an answer to that."),
            }
        )
