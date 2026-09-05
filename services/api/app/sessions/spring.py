import json

from app.db.models.journey import Campaign, Journey
from app.db.session import SessionLocal


def _c(r):
    return {"id": r.id, "name": r.name, "description": r.description, "objective": r.objective, "audience": r.audience, "status": r.status, "devToken": r.dev_token}
def _j(r):
    return {"id": r.id, "campaignId": r.campaign_id, "name": r.name, "graphJson": r.graph_json, "status": r.status, "version": r.version}
async def fetch_campaign_by_token(dev_token):
    db = SessionLocal()
    try:
        r = db.query(Campaign).filter(Campaign.dev_token == dev_token).first()
        if not r:
            raise Exception("not found")
        return _c(r)
    finally:
        db.close()
async def fetch_journey(campaign_id):
    db = SessionLocal()
    try:
        r = db.query(Journey).filter(Journey.campaign_id == campaign_id).order_by(Journey.created_at.asc()).first()
        if not r:
            return None
        return _j(r)
    finally:
        db.close()
async def fetch_graph_version(campaign_id):
    db = SessionLocal()
    try:
        r = db.query(Journey).filter(Journey.campaign_id == campaign_id).order_by(Journey.created_at.asc()).first()
        if not r:
            raise Exception("not found")
        return {"journeyId": r.id, "campaignId": campaign_id, "version": r.version, "status": r.status}
    finally:
        db.close()
def parse_graph(graph_json):
    try:
        raw = json.loads(graph_json or "{}")
    except Exception:
        raw = {}
    if not isinstance(raw, dict):
        raw = {}
    nodes = raw.get("nodes", []) if isinstance(raw.get("nodes", []), list) else []
    edges = raw.get("edges", []) if isinstance(raw.get("edges", []), list) else []
    screens = raw.get("screens", []) if isinstance(raw.get("screens", []), list) else []
    ask_ai = raw.get("askAi")
    if ask_ai is not None and not isinstance(ask_ai, dict):
        ask_ai = None
    return {"nodes": nodes, "edges": edges, "screens": screens, "theme": raw.get("theme", {}), "askAi": ask_ai}
def pick_journey(journey, mode, journey_id=None):
    if journey is None:
        return None
    if journey_id and journey.get("id") != journey_id:
        return None
    if mode == "live" and (journey.get("status") or "") != "PUBLISHED":
        return None
    return journey
