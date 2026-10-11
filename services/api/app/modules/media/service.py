import secrets
from typing import Any

import anyio
import httpx
import orjson
from cachetools import TTLCache
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.errors import Conflict, UnsupportedMedia
from app.core.http import safe_client
from app.core.logging import log_event
from app.modules.media.images import UnsupportedImage, process
from app.modules.media.storage.base import MediaStorage, StoredFile
from app.modules.media.storage.db import DbStorage

_limiter = anyio.CapacityLimiter(2)
_stock = TTLCache[str, list[dict[str, Any]]](maxsize=256, ttl=600)
VIDEO_TYPES = {"video/mp4": "mp4", "video/webm": "webm"}


def storage_for(session: AsyncSession, settings: Settings) -> MediaStorage:
    if settings.storage.resolved_driver == "s3":
        from app.modules.media.storage.s3 import S3Storage

        return S3Storage(settings.storage)
    return DbStorage(session)


async def upload_image(session: AsyncSession, settings: Settings, data: bytes) -> dict[str, Any]:
    try:
        processed = await anyio.to_thread.run_sync(process, data, limiter=_limiter)
    except UnsupportedImage as exc:
        raise UnsupportedMedia("Upload a JPG, PNG, WebP, GIF or AVIF image") from exc
    storage = storage_for(session, settings)
    stem = f"img_{secrets.token_hex(8)}"
    urls: list[tuple[str, int]] = []
    for variant in processed.variants:
        url = await storage.put(
            f"{stem}_{variant.width}.webp", variant.data, "image/webp", variant.width, variant.height
        )
        urls.append((url, variant.width))
    main = next((u for u, w in urls if w >= 1280), urls[-1][0])
    log_event("image stored", event="upload", variants=len(urls), driver=settings.storage.resolved_driver)
    return {
        "key": stem,
        "src": main,
        "srcset": ", ".join(f"{u} {w}w" for u, w in urls),
        "width": processed.width,
        "height": processed.height,
        "dominantColor": processed.dominant,
    }


async def get_file(session: AsyncSession, key: str) -> StoredFile | None:
    return await DbStorage(session).get(key)


async def presign_video(settings: Settings, filename: str, content_type: str, size: int) -> dict[str, Any]:
    if settings.storage.resolved_driver != "s3":
        raise Conflict("Video uploads need cloud storage. Paste a YouTube or Vimeo link instead.")
    ext = VIDEO_TYPES.get(content_type)
    if ext is None:
        raise UnsupportedMedia("Upload an MP4 or WebM video")
    from app.modules.media.storage.s3 import S3Storage

    storage = S3Storage(settings.storage)
    key = f"vid_{secrets.token_hex(8)}.{ext}"
    return {"uploadUrl": await storage.presign_put(key, content_type, size), "publicUrl": storage.url(key)}


async def search_stock(settings: Settings, query: str) -> list[dict[str, Any]]:
    q = " ".join(query.split())[:100]
    if not q:
        return []
    if q in _stock:
        return _stock[q]
    items: list[dict[str, Any]] = []
    try:
        async with safe_client(timeout=6.0) as client:
            resp = await client.get(
                "https://api.openverse.org/v1/images/",
                params={"q": q, "page_size": 24, "license_type": "commercial", "mature": "false"},
            )
        if resp.status_code == 200:
            for hit in orjson.loads(resp.content).get("results", []):
                items.append(
                    {
                        "thumbUrl": hit.get("thumbnail") or hit.get("url"),
                        "fullUrl": hit.get("url"),
                        "license": f"{hit.get('license', '').upper()} {hit.get('license_version', '')}".strip(),
                        "creator": hit.get("creator"),
                        "attributionUrl": hit.get("foreign_landing_url"),
                        "title": hit.get("title"),
                    }
                )
    except httpx.HTTPError as exc:
        log_event("stock search failed", event="stock", err=type(exc).__name__)
    _stock[q] = items
    return items


async def import_remote(session: AsyncSession, settings: Settings, url: str) -> dict[str, Any]:
    from app.core.http import fetch_bytes

    data, _, _ = await fetch_bytes(url, max_bytes=settings.storage.max_image_mb * 1024 * 1024)
    return await upload_image(session, settings, data)
