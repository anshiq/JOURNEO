import hashlib
import hmac
import uuid
from dataclasses import dataclass
from typing import Any

import httpx
import orjson

from app.core.http import BlockedDestination, check_scheme, safe_client


@dataclass(slots=True)
class DeliveryResult:
    delivered: bool
    status_code: int | None
    error: str | None


def payload(lead: dict[str, Any]) -> bytes:
    return orjson.dumps(
        {
            "v": 1,
            "event": "lead.created",
            "campaignId": lead["campaignId"],
            "leadId": lead["leadId"],
            "submittedAt": lead["submittedAt"],
            "answers": lead["answers"],
            "consent": lead.get("consent"),
            "utm": lead.get("utm") or {},
            "test": bool(lead.get("test")),
        }
    )


def sign(body: bytes, secret: str) -> str:
    return "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


async def deliver(url: str, body: bytes, secret: str, delivery_id: str | None = None) -> DeliveryResult:
    headers = {
        "Content-Type": "application/json",
        "X-Journeo-Event": "lead.created",
        "X-Journeo-Delivery": delivery_id or str(uuid.uuid4()),
        "X-Journeo-Signature": sign(body, secret),
    }
    try:
        check_scheme(httpx.URL(url))
        async with safe_client(timeout=8.0) as client:
            resp = await client.post(url, content=body, headers=headers)
    except BlockedDestination:
        return DeliveryResult(False, None, "This address is not allowed")
    except httpx.HTTPError as exc:
        return DeliveryResult(False, None, type(exc).__name__)
    ok = 200 <= resp.status_code < 300
    return DeliveryResult(ok, resp.status_code, None if ok else f"HTTP {resp.status_code}")
