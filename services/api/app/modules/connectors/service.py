import json
import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from app.db.models.connectors import AuditLogEntry, MockCampaign
from app.middleware.request_context import get_request_id


def _rid(explicit=None):
    return explicit or get_request_id()
def _audit(db: Session, actor, platform, action, campaign_id, before, after, rid):
    e = AuditLogEntry(actor=actor, platform=platform, action_type=action, campaign_id=campaign_id, before_state=before if before is None or isinstance(before, str) else json.dumps(before), after_state=after if after is None or isinstance(after, str) else json.dumps(after), request_id=rid)
    db.add(e)
    db.commit()
    return e
def create_meta(db: Session, body: dict, rid=None):
    rid = _rid(rid)
    mc = MockCampaign(platform="meta", name=str(body.get("name", "Untitled")), daily_budget=float(body.get("daily_budget", 100) or 100), external_id=f"act_{uuid.uuid4().hex[:6]}/campaigns/{uuid.uuid4().hex[:8]}", raw_json=json.dumps(body))
    db.add(mc)
    db.commit()
    db.refresh(mc)
    _audit(db, "studio_ai_chat:user", "meta", "create_campaign", mc.external_id, None, mc.raw_json, rid)
    return {"id": mc.external_id, "status": mc.status, "mocked": True, "platform": "meta", "note": "Mocked facebook-business SDK: POST /act_{adaccount}/campaigns"}
def pause_meta(db: Session, cid: str, body=None, rid=None):
    rid = _rid(rid)
    body = body or {}
    q = db.query(MockCampaign).filter((MockCampaign.external_id == cid) | (MockCampaign.id == cid)).first()
    before = q.status if q else None
    if q:
        q.status = "PAUSED"
        q.updated_at = datetime.utcnow()
        db.commit()
    actor = body.get("actor", "system:anomaly_detector") if isinstance(body, dict) else "system:anomaly_detector"
    _audit(db, actor, "meta", "pause_campaign", cid, before, "PAUSED", rid)
    return {"id": cid, "status": "PAUSED", "mocked": True, "platform": "meta"}
def reallocate_meta(db: Session, body: dict, rid=None):
    rid = _rid(rid)
    _audit(db, "system:optimizer", "meta", "reallocate_budget", str(body.get("campaignId")), None, json.dumps(body), rid)
    return {"status": "reallocated", "mocked": True, "platform": "meta", "details": body}
def create_google(db: Session, body: dict, rid=None):
    rid = _rid(rid)
    name = str(body.get("campaignName", body.get("name", "Untitled")))
    b = body.get("budgetMicros")
    if isinstance(b, (int, float)):
        budget = float(b) / 1_000_000
    else:
        budget = float(body.get("daily_budget", 100) or 100)
    mc = MockCampaign(platform="google", name=name, daily_budget=budget, external_id=f"customers/{uuid.uuid4().hex[:6]}/campaigns/{uuid.uuid4().hex[:8]}", raw_json=json.dumps(body))
    db.add(mc)
    db.commit()
    db.refresh(mc)
    _audit(db, "studio_ai_chat:user", "google", "create_campaign", mc.external_id, None, mc.raw_json, rid)
    return {"resourceName": mc.external_id, "status": mc.status, "mocked": True, "platform": "google", "note": "Mocked google-ads SDK: CampaignService.MutateCampaigns"}
def pause_google(db: Session, cid: str, rid=None):
    rid = _rid(rid)
    q = db.query(MockCampaign).filter((MockCampaign.external_id == cid) | (MockCampaign.id == cid)).first()
    before = q.status if q else "ACTIVE"
    if q:
        q.status = "PAUSED"
        q.updated_at = datetime.utcnow()
        db.commit()
    _audit(db, "system:anomaly_detector", "google", "pause_campaign", cid, before, "PAUSED", rid)
    return {"resourceName": cid, "status": "PAUSED", "mocked": True}
def create_whatsapp(db: Session, body: dict, rid=None):
    rid = _rid(rid)
    mc = MockCampaign(platform="whatsapp", name=str(body.get("templateName", body.get("name", "broadcast"))), external_id=f"waba_{uuid.uuid4().hex[:8]}", raw_json=json.dumps(body))
    db.add(mc)
    db.commit()
    db.refresh(mc)
    _audit(db, "journey_node:broadcast", "whatsapp", "create_broadcast", mc.external_id, None, mc.raw_json, rid)
    return {"id": mc.external_id, "status": "SENT", "mocked": True, "platform": "whatsapp", "note": "Mocked WhatsApp Cloud API: POST /{phone-number-id}/messages (template)"}
def get_campaign(db: Session, platform: str, cid: str):
    q = db.query(MockCampaign).filter((MockCampaign.external_id == cid) | (MockCampaign.id == cid)).first()
    if q is None:
        return {"error": "not found", "mocked": True}
    return {"id": q.external_id, "platform": q.platform, "name": q.name, "status": q.status, "dailyBudget": q.daily_budget, "mocked": True}
async def dispatch(db: Session, platform: str, action: str, payload: dict):
    payload = payload or {}
    if platform == "meta":
        if action == "create_campaign":
            return create_meta(db, payload)
        if action == "pause_campaign":
            return pause_meta(db, payload.get("campaignId") or payload.get("campaign_id") or payload.get("id", ""))
        if action == "reallocate_budget":
            return reallocate_meta(db, payload)
    elif platform == "google":
        if action == "create_campaign":
            return create_google(db, payload)
        if action == "pause_campaign":
            return pause_google(db, payload.get("campaignId") or payload.get("campaign_id") or payload.get("resourceName", ""))
    elif platform == "whatsapp":
        return create_whatsapp(db, payload)
    return {"error": "unknown platform/action", "mocked": True}
