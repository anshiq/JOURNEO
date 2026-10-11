import re
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

ElementType = Literal[
    "heading", "text", "image", "video", "buttons", "cards", "countdown", "spacer", "choice", "rating", "form"
]
RECIPES = (
    "welcome",
    "question",
    "picture-choice",
    "rating-nps",
    "lead-form",
    "product-picks",
    "video",
    "offer-countdown",
    "coupon-reveal",
    "thank-you",
    "blank",
)
PRESETS = ("classic", "editorial", "bold", "minimal", "midnight")
PAIRINGS = ("classic", "editorial", "modern", "friendly", "elegant", "bold", "tech", "rounded")
HEX = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")


class Lenient(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)


class ElementSpec(Lenient):
    type: ElementType
    props: dict[str, Any] = Field(default_factory=dict)


class ScreenSpec(Lenient):
    title: str = Field(min_length=1, max_length=60)
    recipe: str = "blank"
    purpose: str | None = Field(default=None, max_length=300)
    elements: list[ElementSpec] = Field(default_factory=list, max_length=12)
    ends: bool = False

    @field_validator("recipe", mode="before")
    @classmethod
    def known_recipe(cls, value: Any) -> str:
        text = str(value or "").strip().lower()
        return text if text in RECIPES else "blank"

    @field_validator("title", mode="before")
    @classmethod
    def trim_title(cls, value: Any) -> str:
        return " ".join(str(value or "Screen").split())[:60] or "Screen"


class GotoSpec(Lenient):
    source: str = Field(alias="from", max_length=60)
    item: str = Field(max_length=100)
    to: str = Field(max_length=60)


class BranchSpec(Lenient):
    after: str = Field(max_length=60)
    answer: str = Field(max_length=60)
    op: str = Field(default="is", max_length=20)
    value: str | float | list[str] | None = None
    to: str = Field(max_length=60)
    label: str | None = Field(default=None, max_length=60)


class ThemeHints(Lenient):
    primary: str | None = None
    accent: str | None = None
    preset: str | None = None
    pairing: str | None = None
    voice: str | None = Field(default=None, max_length=500)

    @field_validator("primary", "accent", mode="before")
    @classmethod
    def hex_only(cls, value: Any) -> str | None:
        return value if isinstance(value, str) and HEX.match(value) else None

    @field_validator("preset", mode="before")
    @classmethod
    def known_preset(cls, value: Any) -> str | None:
        return value if value in PRESETS else None

    @field_validator("pairing", mode="before")
    @classmethod
    def known_pairing(cls, value: Any) -> str | None:
        return value if value in PAIRINGS else None


class AuthoringSpec(Lenient):
    theme_hints: ThemeHints = Field(default_factory=ThemeHints, alias="themeHints")
    screens: list[ScreenSpec] = Field(min_length=1, max_length=12)
    gotos: list[GotoSpec] = Field(default_factory=list, max_length=24)
    branches: list[BranchSpec] = Field(default_factory=list, max_length=24)

    @field_validator("screens")
    @classmethod
    def unique_titles(cls, screens: list[ScreenSpec]) -> list[ScreenSpec]:
        seen: dict[str, int] = {}
        for screen in screens:
            key = screen.title.lower()
            if key in seen:
                seen[key] += 1
                screen.title = f"{screen.title[:56]} {seen[key]}"
            else:
                seen[key] = 1
        return screens

    def compose_input(self) -> dict[str, Any]:
        return {
            "screens": [
                {
                    "title": s.title,
                    "recipe": s.recipe,
                    "elements": [e.model_dump() for e in s.elements],
                    "ends": s.ends,
                }
                for s in self.screens
            ],
            "gotos": [{"from": g.source, "item": g.item, "to": g.to} for g in self.gotos],
            "branches": [b.model_dump(exclude_none=True) for b in self.branches],
        }

    def theme(self) -> dict[str, Any]:
        hints = self.theme_hints
        theme: dict[str, Any] = {}
        if hints.preset:
            theme["preset"] = hints.preset
        colors = {k: v for k, v in (("primary", hints.primary), ("accent", hints.accent)) if v}
        if colors:
            theme["colors"] = colors
        if hints.pairing:
            theme["fonts"] = {"pairing": hints.pairing}
        if hints.voice:
            theme["voice"] = hints.voice
        return theme
