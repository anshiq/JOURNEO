import httpx
from app.config import settings
from app.middleware.request_context import get_request_id
async def meta_create(payload: dict):
    headers={"X-Request-Id": get_request_id() or ""}
    async with httpx.AsyncClient(timeout=5) as c:
        r=await c.post(f"{settings.connectors_service_url}/mock/meta/campaigns", json=payload, headers=headers)
        return r.json()
async def meta_pause(campaign_id: str):
    headers={"X-Request-Id": get_request_id() or ""}
    async with httpx.AsyncClient(timeout=5) as c:
        r=await c.post(f"{settings.connectors_service_url}/mock/meta/campaigns/{campaign_id}/pause", json={}, headers=headers)
        return r.json()
