from typing import Annotated, Literal

from pydantic import Field, StringConstraints, model_validator

from app.modules.journeys.domain.limits import L
from app.modules.journeys.domain.schema.actions import Id, Strict
from app.modules.journeys.domain.schema.elements import Element, Focal
from app.modules.journeys.domain.schema.steps import Step
from app.modules.journeys.domain.schema.theme import Background, Theme

PortKey = Annotated[str, StringConstraints(min_length=1, max_length=L.port)]


class MediaSlot(Strict):
    kind: Literal["image", "video"] = "image"
    src: Annotated[str, StringConstraints(max_length=L.url)] = ""
    srcset: Annotated[str, StringConstraints(max_length=L.srcset)] | None = None
    alt: Annotated[str, StringConstraints(max_length=L.alt_text)] = ""
    focal: Focal = Focal()
    side: Literal["left", "right"] = "right"
    on_mobile: Literal["top", "background", "hidden"] = "top"
    darken: int = Field(default=35, ge=0, le=80)


class ScreenLayout(Strict):
    preset: Literal["stack", "split", "cover"] = "stack"
    media: MediaSlot | None = None
    width: Literal["narrow", "normal", "wide"] = "normal"
    v_align: Literal["top", "center"] = "top"
    h_align: Literal["left", "center"] = "left"
    spacing: Literal["compact", "comfortable", "spacious"] = "comfortable"


class ScreenOverride(Strict):
    preset: Literal["stack", "split", "cover"] | None = None
    width: Literal["narrow", "normal", "wide"] | None = None
    h_align: Literal["left", "center"] | None = None
    media_side: Literal["left", "right"] | None = None


class ScreenResponsive(Strict):
    tablet: ScreenOverride | None = None
    desktop: ScreenOverride | None = None


class Screen(Strict):
    id: Id
    name: Annotated[str, StringConstraints(max_length=L.screen_name)]
    layout: ScreenLayout = ScreenLayout()
    background: Background | None = None
    color_scheme: Literal["theme", "inverse"] = "theme"
    elements: list[Element] = Field(default_factory=list, max_length=L.max_elements_per_screen)
    responsive: ScreenResponsive | None = None
    allow_back: bool | None = None
    show_assistant: bool = False
    sticky_action: bool = False


class Assistant(Strict):
    greeting: Annotated[str, StringConstraints(max_length=L.chat_greeting)] = "How can I help?"
    placeholder: Annotated[str, StringConstraints(max_length=L.chat_placeholder)] = "Ask a question"
    suggested: list[Annotated[str, StringConstraints(max_length=L.suggested_question)]] = Field(
        default_factory=list, max_length=L.max_suggested
    )
    fallback: Annotated[str, StringConstraints(max_length=L.fallback_text)] = "I could not find an answer to that."
    fallback_cta_label: Annotated[str, StringConstraints(max_length=L.button_label)] | None = None
    fallback_target: Id | None = None
    placement: Literal["floating", "pinned"] = "floating"


class Seo(Strict):
    title: Annotated[str, StringConstraints(max_length=L.seo_title)] | None = None
    description: Annotated[str, StringConstraints(max_length=L.seo_description)] | None = None
    image: Annotated[str, StringConstraints(max_length=L.url)] | None = None


class Legal(Strict):
    company: Annotated[str, StringConstraints(max_length=L.legal_company)] | None = None
    privacy_url: Annotated[str, StringConstraints(max_length=L.url)] | None = None
    terms_url: Annotated[str, StringConstraints(max_length=L.url)] | None = None


class JourneySettings(Strict):
    progress: Literal["none", "bar"] = "bar"
    allow_back: bool = False
    seo: Seo = Seo()
    legal: Legal = Legal()


class JourneyDoc(Strict):
    schema_version: Literal[4]
    theme: Theme = Theme()
    screens: dict[Id, Screen] = Field(default_factory=dict)
    steps: list[Step] = Field(default_factory=list, max_length=L.max_steps)
    links: dict[Id, dict[PortKey, Id]] = Field(default_factory=dict)
    assistant: Assistant | None = None
    settings: JourneySettings = JourneySettings()

    @model_validator(mode="after")
    def invariants(self) -> "JourneyDoc":
        problems = model_problems(self)
        if problems:
            raise ValueError("; ".join(problems[:5]))
        return self


def model_problems(doc: JourneyDoc) -> list[str]:
    problems: list[str] = []
    seen: set[str] = set()

    def claim(value: str) -> None:
        if value in seen:
            problems.append(f"duplicate id {value}")
        seen.add(value)

    starts = [s for s in doc.steps if s.kind == "start"]
    if len(starts) != 1:
        problems.append(f"exactly one start step is required, found {len(starts)}")
    kinds = {s.id: s.kind for s in doc.steps}
    for step in doc.steps:
        claim(step.id)
        if step.kind == "condition":
            for rule in step.rules:
                claim(rule.id)
    for key, screen in doc.screens.items():
        if key != screen.id:
            problems.append(f"screen key {key} does not match id {screen.id}")
        if kinds.get(key) != "screen":
            problems.append(f"screen {key} has no screen step")
        for el in screen.elements:
            claim(el.id)
            for attr in ("items", "options", "fields", "bands"):
                for item in getattr(el.props, attr, None) or []:
                    claim(item.id)
    for step in doc.steps:
        if step.kind == "screen" and step.id not in doc.screens:
            problems.append(f"screen step {step.id} has no screen")
    for source, ports in doc.links.items():
        if source not in kinds:
            problems.append(f"link from unknown step {source}")
        for target in ports.values():
            if target not in kinds:
                problems.append(f"link to unknown step {target}")
            elif kinds[target] == "start":
                problems.append("links cannot point to the start step")
    return problems
