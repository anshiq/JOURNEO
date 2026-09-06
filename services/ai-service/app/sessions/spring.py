import httpx
from app.config import settings


def base():
    return (settings.journey_service_url or "http://localhost:8081").rstrip("/")


async def fetch_campaign_by_token(dev_token):
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{base()}/api/campaigns/dev/{dev_token}")
        resp.raise_for_status()
        return resp.json()


async def fetch_journey(campaign_id):
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{base()}/api/campaigns/{campaign_id}/journey")
        if resp.status_code == 204:
            return None
        resp.raise_for_status()
        data = resp.json()
        return data if isinstance(data, dict) else None


async def fetch_graph_version(campaign_id):
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{base()}/api/campaigns/{campaign_id}/journey/graph-version")
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


def pick_journey(journey, mode, journey_id=None):
    if journey is None:
        return None
    if journey_id and journey.get("id") != journey_id:
        return None
    if mode == "live" and (journey.get("status") or "") != "PUBLISHED":
        return None
    return journey
