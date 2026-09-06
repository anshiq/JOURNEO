import httpx
from app.config import settings


def base():
    return (settings.journey_service_url or "http://localhost:8081").rstrip("/")


async def fetch_campaign_by_token(dev_token):
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{base()}/api/campaigns/dev/{dev_token}")
        resp.raise_for_status()
        return resp.json()


async def fetch_journeys(campaign_id):
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{base()}/api/campaigns/{campaign_id}/journeys")
        resp.raise_for_status()
        data = resp.json()
        return data if isinstance(data, list) else []


async def fetch_graph_version(campaign_id, journey_id):
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{base()}/api/campaigns/{campaign_id}/journeys/{journey_id}/graph-version")
        resp.raise_for_status()
        return resp.json()


def parse_graph(graph_json):
    import json
    try:
        raw = json.loads(graph_json or "{}")
    except Exception:
        raw = {}
    if not isinstance(raw, dict):
        raw = {}
    nodes = raw.get("nodes", []) if isinstance(raw.get("nodes", []), list) else []
    edges = raw.get("edges", []) if isinstance(raw.get("edges", []), list) else []
    return {"nodes": nodes, "edges": edges, "theme": raw.get("theme", {})}


def pick_journey(journeys, mode, journey_id=None):
    if journey_id:
        for j in journeys:
            if j.get("id") == journey_id:
                return j
        return None
    if mode == "live":
        for j in journeys:
            if (j.get("status") or "") == "PUBLISHED":
                return j
        return None
    return journeys[0] if journeys else None
