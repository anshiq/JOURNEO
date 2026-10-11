from collections.abc import Iterator
from typing import Any

from app.modules.journeys.domain.analysis import DocIndex
from app.modules.journeys.domain.rules.content import parse_iso
from app.modules.journeys.domain.rules.model import Issue, Target, ValidationContext, warning
from app.modules.journeys.domain.summary import plain


def luminance(hex_color: str) -> float:
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    channels = [int(h[i : i + 2], 16) / 255.0 for i in (0, 2, 4)]

    def linear(c: float) -> float:
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = (linear(c) for c in channels)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a: str, b: str) -> float:
    la, lb = luminance(a), luminance(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def on_color(background: str) -> str:
    return "#111827" if contrast("#111827", background) >= contrast("#ffffff", background) else "#ffffff"


def check_compliance(doc: Any, index: DocIndex, ctx: ValidationContext) -> Iterator[Issue]:
    for sid, screen in doc.screens.items():
        for el in screen.elements:
            if el.type == "image" and not el.props.alt.strip():
                yield warning(
                    "W_ALT",
                    "Describe this image for people using screen readers",
                    Target(kind="element", id=el.id, screen_id=sid, field="alt"),
                    "focus_alt",
                )
            elif el.type == "countdown" and ctx.now is not None:
                deadline = parse_iso(el.props.deadline)
                if deadline is not None and deadline.tzinfo is not None and deadline < ctx.now:
                    yield warning(
                        "W_COUNTDOWN_PAST",
                        "This deadline has already passed",
                        Target(kind="element", id=el.id, screen_id=sid, field="deadline"),
                        "focus_deadline",
                    )
            elif el.type == "form":
                kinds = {f.kind for f in el.props.fields}
                if kinds & {"email", "phone"} and "consent" not in kinds:
                    yield warning(
                        "W_CONSENT",
                        "You collect contact details, add a consent checkbox",
                        Target(kind="element", id=el.id, screen_id=sid, field="fields"),
                        "add_consent",
                    )
        media = screen.layout.media
        if media is not None and media.src and not media.alt.strip() and media.kind == "image":
            yield warning(
                "W_ALT",
                f"Describe the image on ‘{plain(screen.name, 30)}’",
                Target(kind="screen", id=sid, field="media"),
                "focus_alt",
            )
    colors = doc.theme.colors
    if contrast(colors.text, colors.background) < 4.5:
        yield warning(
            "W_CONTRAST",
            "Text is hard to read on the background colour",
            Target(kind="theme", id="colors", field="text"),
            "open_color",
        )
    button_text = colors.on_primary or on_color(colors.primary)
    if contrast(button_text, colors.primary) < 4.5:
        yield warning(
            "W_CONTRAST",
            "Button text is hard to read on the main colour",
            Target(kind="theme", id="colors", field="primary"),
            "open_color",
        )
    if not doc.settings.seo.image:
        first = index.first_screen()
        screen = doc.screens.get(first) if first else None
        has_image = screen is not None and (
            any(e.type == "image" for e in screen.elements) or bool(screen.layout.media and screen.layout.media.src)
        )
        if not has_image and doc.theme.logo is None:
            yield warning(
                "W_SEO_IMAGE",
                "Add a share image so your link looks good when shared",
                Target(kind="settings", id="seo", field="image"),
                "open_share",
            )
