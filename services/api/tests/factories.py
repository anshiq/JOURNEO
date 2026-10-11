import copy
import itertools
from typing import Any

from app.modules.journeys.domain.schema.doc import JourneyDoc


class DocBuilder:
    def __init__(self) -> None:
        self.screens: dict[str, dict[str, Any]] = {}
        self.steps: list[dict[str, Any]] = [{"id": "stp_start0", "kind": "start"}]
        self.links: dict[str, dict[str, str]] = {}
        self.extra: dict[str, Any] = {}

    def screen(self, sid: str, *elements: dict[str, Any], **extra: Any) -> "DocBuilder":
        self.screens[sid] = {"id": sid, "name": extra.pop("name", sid), "elements": list(elements), **extra}
        self.steps.append({"id": sid, "kind": "screen"})
        if len(self.screens) == 1:
            self.links["stp_start0"] = {"next": sid}
        return self

    def step(self, step: dict[str, Any]) -> "DocBuilder":
        self.steps.append(step)
        return self

    def link(self, source: str, port: str, target: str) -> "DocBuilder":
        self.links.setdefault(source, {})[port] = target
        return self

    def chain(self, *ids: str) -> "DocBuilder":
        for a, b in itertools.pairwise(ids):
            self.link(a, "next", b)
        return self

    def with_(self, **extra: Any) -> "DocBuilder":
        self.extra.update(extra)
        return self

    def build(self) -> dict[str, Any]:
        doc = {
            "schemaVersion": 4,
            "theme": {},
            "screens": copy.deepcopy(self.screens),
            "steps": copy.deepcopy(self.steps),
            "links": copy.deepcopy(self.links),
            "settings": {"seo": {"image": "https://example.com/share.png"}},
        }
        doc.update(copy.deepcopy(self.extra))
        return doc

    def parsed(self) -> JourneyDoc:
        return JourneyDoc.model_validate(self.build())


def heading(eid: str, text: str = "Hello") -> dict[str, Any]:
    return {"id": eid, "type": "heading", "props": {"text": text}}


def text(eid: str, value: str = "Body") -> dict[str, Any]:
    return {"id": eid, "type": "text", "props": {"text": value}}


def buttons(eid: str, *items: tuple[str, str, dict[str, Any]]) -> dict[str, Any]:
    return {
        "id": eid,
        "type": "buttons",
        "props": {"items": [{"id": iid, "label": label, "action": action} for iid, label, action in items]},
    }


def next_button(eid: str, iid: str, label: str = "Continue") -> dict[str, Any]:
    return buttons(eid, (iid, label, {"kind": "next"}))


def choice(eid: str, key: str, options: list[tuple[str, str]], **props: Any) -> dict[str, Any]:
    return {
        "id": eid,
        "type": "choice",
        "props": {
            "question": "Pick one",
            "key": key,
            "options": [{"id": i, "label": label} for i, label in options],
            **props,
        },
    }


def form(eid: str, *fields: dict[str, Any], submit: str = "Send") -> dict[str, Any]:
    return {"id": eid, "type": "form", "props": {"fields": list(fields), "submitLabel": submit}}


def field(fid: str, kind: str, key: str, **extra: Any) -> dict[str, Any]:
    return {"id": fid, "kind": kind, "label": extra.pop("label", key.title()), "key": key, **extra}


def lead_doc() -> dict[str, Any]:
    return (
        DocBuilder()
        .screen("scr_welcome", heading("el_head01", "Welcome"), next_button("el_btn001", "it_go00001", "Start"))
        .screen(
            "scr_form01",
            form(
                "el_form01",
                field("fld_name01", "name", "first_name", required=True, label="First name"),
                field("fld_mail01", "email", "email", required=True, unique=True, label="Email"),
                field("fld_cons01", "consent", "consent", required=True, consentText="I agree"),
            ),
        )
        .screen("scr_thanks", heading("el_head02", "Thanks"))
        .chain("scr_welcome", "scr_form01", "scr_thanks")
        .build()
    )
