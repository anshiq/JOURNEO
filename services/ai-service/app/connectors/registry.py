from app.connectors.meta_connector import meta_create, meta_pause
from app.connectors.google_connector import google_create
from app.connectors.whatsapp_connector import whatsapp_broadcast
async def dispatch(platform: str, action: str, payload: dict):
    if platform=="meta":
        if action=="create_campaign": return await meta_create(payload)
        if action=="pause_campaign": return await meta_pause(payload.get("campaignId") or payload.get("campaign_id") or payload.get("id",""))
        if action=="reallocate_budget":
            import httpx
            from app.config import settings
            from app.middleware.request_context import get_request_id
            headers={"X-Request-Id": get_request_id() or ""}
            async with httpx.AsyncClient(timeout=5) as c:
                r=await c.post(f"{settings.connectors_service_url}/mock/meta/budget-reallocate", json=payload, headers=headers)
                return r.json()
    elif platform=="google":
        if action=="create_campaign": return await google_create(payload)
        if action=="pause_campaign":
            import httpx
            from app.config import settings
            from app.middleware.request_context import get_request_id
            headers={"X-Request-Id": get_request_id() or ""}
            async with httpx.AsyncClient(timeout=5) as c:
                r=await c.post(f"{settings.connectors_service_url}/mock/google/campaigns/{payload.get('campaignId','')}/pause", json={}, headers=headers)
                return r.json()
    elif platform=="whatsapp":
        return await whatsapp_broadcast(payload)
    return {"error":"unknown platform/action","mocked":True}
