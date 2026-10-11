import asyncio
import hashlib
import html
import logging
import re
import time
from dataclasses import dataclass
from typing import Any

import httpx

from app.core.logging import log_event

HEAD_SLOT = re.compile(r"<meta\s+name=[\"']jx-head-slot[\"']\s*/?>")
DOC_SLOT = re.compile(r"<script\s+id=[\"']jx-doc[\"']\s+type=[\"']application/json[\"']>\s*null\s*</script>")
MARKDOWN = re.compile(r"[*_`]|\{\{[^}]*\}\}")
CSP = (
    "default-src 'self'; img-src 'self' data: https:; media-src 'self' https:; "
    "frame-src https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com; connect-src 'self'; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self'; "
    "font-src 'self' data: https://fonts.gstatic.com; "
    "frame-ancestors 'self'; base-uri 'none'; form-action 'self'"
)
FALLBACK = (
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" '
    'content="width=device-width, initial-scale=1"><meta name="jx-head-slot"><meta http-equiv="refresh" content="5">'
    '</head><body><div id="jx-player">Loading…</div><script id="jx-doc" type="application/json">null</script>'
    "</body></html>"
)


@dataclass(slots=True)
class PageMeta:
    title: str
    description: str
    image: str
    url: str
    noindex: bool = False


def escape(value: str) -> str:
    return html.escape(value or "", quote=True)


def absolute(url: str, base: str) -> str:
    if not url:
        return ""
    if url.startswith(("http://", "https://")):
        return url
    return f"{base.rstrip('/')}/{url.lstrip('/')}"


def render_page(template: str, meta: PageMeta, payload_json: bytes, fonts: list[str]) -> str:
    head = "".join(
        [
            f"<title>{escape(meta.title)}</title>",
            f'<meta name="description" content="{escape(meta.description)}">',
            '<meta property="og:type" content="website">',
            f'<meta property="og:title" content="{escape(meta.title)}">',
            f'<meta property="og:description" content="{escape(meta.description)}">',
            f'<meta property="og:image" content="{escape(meta.image)}">' if meta.image else "",
            f'<meta property="og:url" content="{escape(meta.url)}">',
            '<meta name="twitter:card" content="summary_large_image">',
            f'<link rel="canonical" href="{escape(meta.url)}">',
            '<meta name="robots" content="noindex">' if meta.noindex else "",
            "".join(f'<link rel="preload" as="font" type="font/woff2" href="{escape(f)}" crossorigin>' for f in fonts),
        ]
    )
    payload = (
        payload_json.decode()
        .replace("<", "\\u003c")
        .replace(">", "\\u003e")
        .replace("&", "\\u0026")
        .replace(" ", "\\u2028")
        .replace(" ", "\\u2029")
    )
    out = HEAD_SLOT.sub(lambda _: head, template, count=1)
    return DOC_SLOT.sub(lambda _: f'<script id="jx-doc" type="application/json">{payload}</script>', out, count=1)


def first_screen_meta(doc: dict[str, Any]) -> tuple[str, str, str]:
    steps = {s.get("id"): s for s in doc.get("steps", []) if isinstance(s, dict)}
    links = doc.get("links", {}) or {}
    start = next((sid for sid, s in steps.items() if s.get("kind") == "start"), None)
    current = links.get(start, {}).get("next") if start else None
    screens = doc.get("screens", {}) or {}
    seen: set[str] = set()
    while current and current not in seen and current not in screens:
        seen.add(current)
        current = links.get(current, {}).get("else") or links.get(current, {}).get("next")
    screen = screens.get(current) if current else None
    title, description, image = "", "", ""
    if isinstance(screen, dict):
        media = (screen.get("layout") or {}).get("media") or {}
        image = media.get("src", "") if media.get("kind", "image") == "image" else ""
        for el in screen.get("elements", []):
            props = el.get("props", {})
            if el.get("type") == "heading" and not title:
                title = str(props.get("text", ""))
            elif el.get("type") == "text" and not description:
                description = str(props.get("text", ""))
            elif el.get("type") == "image" and not image:
                image = str(props.get("src", ""))
    return title, description, image


def clean(value: str) -> str:
    return " ".join(MARKDOWN.sub("", value or "").split())


def meta_for(doc: dict[str, Any] | None, name: str, url: str, base: str, noindex: bool = False) -> PageMeta:
    doc = doc or {}
    seo = ((doc.get("settings") or {}).get("seo")) or {}
    title, description, image = first_screen_meta(doc)
    logo = ((doc.get("theme") or {}).get("logo") or {}).get("src", "")

    return PageMeta(
        title=clean(seo.get("title") or title or name)[:70] or name,
        description=clean(seo.get("description") or description)[:160],
        image=absolute(seo.get("image") or image or logo, base),
        url=url,
        noindex=noindex,
    )


def page_etag(*parts: object) -> str:
    return '"' + hashlib.sha256("|".join(str(p) for p in parts).encode()).hexdigest()[:32] + '"'


class PageTemplates:
    def __init__(self) -> None:
        self.template: str | None = None
        self.etag: str | None = None
        self.fetched_at = 0.0
        self.lock = asyncio.Lock()

    async def fetch(self, settings: Any) -> None:
        async with self.lock:
            self.fetched_at = time.monotonic()
            headers = {"If-None-Match": self.etag} if self.etag and self.template else {}
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.get(f"{settings.frontend_origin.rstrip('/')}/play.html", headers=headers)
            except httpx.HTTPError as exc:
                log_event(
                    "page template unavailable", level=logging.WARNING, event="page_template", err=type(exc).__name__
                )
                return
            if resp.status_code == 200 and HEAD_SLOT.search(resp.text) and DOC_SLOT.search(resp.text):
                self.template = resp.text
                self.etag = resp.headers.get("etag")
            elif resp.status_code != 304:
                log_event(
                    "page template invalid", level=logging.WARNING, event="page_template", status=resp.status_code
                )

    async def get(self, settings: Any) -> str:
        if self.template is None and time.monotonic() - self.fetched_at > 5:
            await self.fetch(settings)
        return self.template or FALLBACK

    async def refresh_forever(self, settings: Any, interval: float = 60.0) -> None:
        while True:
            await self.fetch(settings)
            await asyncio.sleep(interval if self.template else 10.0)


page_templates = PageTemplates()
