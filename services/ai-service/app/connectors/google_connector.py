import httpx
from app.config import settings
from app.middleware.request_context import get_request_id
async def google_create(payload: dict):
    headers={"X-Request-Id": get_request_id() or ""}
    async with httpx.AsyncClient(timeout=5) as c:
        r=await c.post(f"{settings.connectors_service_url}/mock/google/campaigns", json=payload, headers=headers)
        return r.json()
