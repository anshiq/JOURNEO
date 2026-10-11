from typing import Annotated, Literal

from pydantic import Field, StringConstraints

from app.modules.journeys.domain.limits import L
from app.modules.journeys.domain.schema.actions import ColorRef, Hex, Strict

PairingId = Literal["classic", "editorial", "modern", "friendly", "elegant", "bold", "tech", "rounded"]
FontId = Literal[
    "inter",
    "source-sans-3",
    "playfair-display",
    "space-grotesk",
    "nunito",
    "cormorant-garamond",
    "lato",
    "archivo",
    "ibm-plex-sans",
    "poppins",
    "open-sans",
    "dm-sans",
]


class ThemeColors(Strict):
    primary: Hex = "#4f46e5"
    accent: Hex = "#f97316"
    background: Hex = "#ffffff"
    surface: Hex = "#ffffff"
    text: Hex = "#111827"
    on_primary: Hex | None = None
    muted: Hex | None = None
    border: Hex | None = None


class ThemeFonts(Strict):
    pairing: PairingId = "classic"
    heading: FontId | None = None
    body: FontId | None = None


class ThemeButtons(Strict):
    style: Literal["solid", "outline", "soft"] = "solid"
    case: Literal["normal", "upper"] = "normal"


class ThemeInputs(Strict):
    style: Literal["outline", "filled", "underline"] = "outline"


class Gradient(Strict):
    from_: ColorRef = Field(default="background", alias="from")
    to: ColorRef = "surface"
    direction: Literal["down", "right", "diagonal"] = "down"


class BackgroundImage(Strict):
    src: Annotated[str, StringConstraints(max_length=L.url)]
    darken: int = Field(default=40, ge=0, le=80)


class Background(Strict):
    type: Literal["color", "gradient", "image"] = "color"
    color: ColorRef | None = None
    gradient: Gradient | None = None
    image: BackgroundImage | None = None


class ThemeLogo(Strict):
    src: Annotated[str, StringConstraints(max_length=L.url)]
    position: Literal["left", "center"] = "left"
    size: Literal["sm", "md", "lg"] = "md"


class Theme(Strict):
    preset: Annotated[str, StringConstraints(max_length=40)] | None = None
    colors: ThemeColors = ThemeColors()
    fonts: ThemeFonts = ThemeFonts()
    type_scale: Literal["compact", "default", "large"] = "default"
    radius: Literal["none", "sm", "md", "lg", "full"] = "md"
    buttons: ThemeButtons = ThemeButtons()
    inputs: ThemeInputs = ThemeInputs()
    density: Literal["compact", "comfortable", "spacious"] = "comfortable"
    background: Background = Background()
    logo: ThemeLogo | None = None
    voice: Annotated[str, StringConstraints(max_length=L.brand_voice)] | None = None
