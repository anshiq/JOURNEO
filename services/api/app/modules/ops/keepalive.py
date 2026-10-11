import asyncio
import random

import httpx

from app.core.config import KeepaliveSettings
from app.core.logging import log_event


async def run_keepalive(settings: KeepaliveSettings) -> None:
    urls = list(settings.urls or [])
    if not urls:
        return
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        while True:
            for target in urls:
                try:
                    resp = await client.get(target.rstrip("/"))
                    log_event("keepalive ping", event="keepalive", status=resp.status_code)
                except httpx.HTTPError as exc:
                    log_event("keepalive failed", event="keepalive", err=type(exc).__name__)
            await asyncio.sleep(settings.interval_s + random.uniform(-30, 30))
