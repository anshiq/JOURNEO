from typing import Any

VARIABLE = {
    "inter",
    "source-sans-3",
    "playfair-display",
    "space-grotesk",
    "nunito",
    "cormorant-garamond",
    "archivo",
    "ibm-plex-sans",
    "open-sans",
    "dm-sans",
}
STATIC = {"lato", "poppins"}
PAIRINGS = {
    "classic": ("inter", "inter"),
    "editorial": ("playfair-display", "source-sans-3"),
    "modern": ("space-grotesk", "inter"),
    "friendly": ("nunito", "nunito"),
    "elegant": ("cormorant-garamond", "lato"),
    "bold": ("archivo", "dm-sans"),
    "tech": ("ibm-plex-sans", "ibm-plex-sans"),
    "rounded": ("poppins", "open-sans"),
}


def font_files(font_id: str) -> list[str]:
    if font_id in VARIABLE:
        return [f"/fonts/{font_id}-latin-wght-normal.woff2"]
    if font_id in STATIC:
        return [f"/fonts/{font_id}-latin-400-normal.woff2", f"/fonts/{font_id}-latin-700-normal.woff2"]
    return []


def preload_fonts(doc: dict[str, Any] | None) -> list[str]:
    fonts = ((doc or {}).get("theme") or {}).get("fonts") or {}
    heading, body = PAIRINGS.get(str(fonts.get("pairing") or "classic"), PAIRINGS["classic"])
    heading = str(fonts.get("heading") or heading)
    body = str(fonts.get("body") or body)
    urls: list[str] = []
    for font_id in (heading, body):
        for url in font_files(font_id):
            if url not in urls:
                urls.append(url)
    return urls
