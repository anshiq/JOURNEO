import json
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, Response

from app.db.models.journey import ActivityEvent, Campaign, FieldValue, Journey
from app.db.session import SessionLocal
from app.middleware.request_context import get_request_id, put_fact
from app.modules.journeys import graph as G

router = APIRouter()
def _c(db, row):
    return {"id": row.id, "name": row.name, "description": row.description, "objective": row.objective, "audience": row.audience, "status": row.status, "createdAt": row.created_at.isoformat() if row.created_at else None, "updatedAt": row.updated_at.isoformat() if row.updated_at else None, "deletedAt": row.deleted_at.isoformat() if row.deleted_at else None, "devToken": row.dev_token, "devTokenCreatedAt": row.dev_token_created_at.isoformat() if row.dev_token_created_at else None, "devLink": f"/d/{row.dev_token}" if row.dev_token else None}
def _j(db, row):
    return {"id": row.id, "campaignId": row.campaign_id, "name": row.name, "graphJson": row.graph_json, "graph": json.loads(row.graph_json or "{}"), "status": row.status, "version": row.version, "createdAt": row.created_at.isoformat() if row.created_at else None, "updatedAt": row.updated_at.isoformat() if row.updated_at else None}
@router.post("/api/campaigns")
def create_campaign(body: dict):
    db = SessionLocal()
    try:
        c = Campaign(name=str(body.get("name", "Untitled")), description=str(body.get("description", "")), objective=str(body.get("objective", "")), audience=str(body.get("audience", "")), status="ACTIVE")
        if not c.dev_token:
            c.dev_token = str(uuid.uuid4())
            c.dev_token_created_at = datetime.utcnow()
        db.add(c)
        db.commit()
        db.refresh(c)
        put_fact("campaignId", c.id)
        return _c(db, c)
    finally:
        db.close()
@router.get("/api/campaigns")
def list_campaigns(includeDeleted: bool = False):
    db = SessionLocal()
    try:
        q = db.query(Campaign)
        if not includeDeleted:
            q = q.filter(Campaign.deleted_at.is_(None))
        return [_c(db, r) for r in q.all()]
    finally:
        db.close()
@router.get("/api/campaigns/dev/{token}")
def by_dev_token(token: str):
    db = SessionLocal()
    try:
        r = db.query(Campaign).filter(Campaign.dev_token == token).first()
        if not r:
            raise HTTPException(404, "not found")
        return _c(db, r)
    finally:
        db.close()
@router.get("/api/campaigns/{cid}")
def get_campaign(cid: str):
    db = SessionLocal()
    try:
        r = db.query(Campaign).filter(Campaign.id == cid).first()
        if not r:
            raise HTTPException(404, "not found")
        return _c(db, r)
    finally:
        db.close()
@router.delete("/api/campaigns/{cid}", status_code=204)
def soft_delete(cid: str):
    db = SessionLocal()
    try:
        r = db.query(Campaign).filter(Campaign.id == cid).first()
        if not r:
            raise HTTPException(404, "not found")
        r.deleted_at = datetime.utcnow()
        r.updated_at = datetime.utcnow()
        db.commit()
        return Response(status_code=204)
    finally:
        db.close()
@router.post("/api/campaigns/{cid}/restore")
def restore(cid: str):
    db = SessionLocal()
    try:
        r = db.query(Campaign).filter(Campaign.id == cid).first()
        if not r:
            raise HTTPException(404, "not found")
        r.deleted_at = None
        r.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(r)
        return _c(db, r)
    finally:
        db.close()
@router.put("/api/campaigns/{cid}")
def update_campaign(cid: str, body: dict):
    db = SessionLocal()
    try:
        r = db.query(Campaign).filter(Campaign.id == cid).first()
        if not r:
            raise HTTPException(404, "not found")
        for k in ("name", "description", "objective", "audience"):
            if k in body:
                setattr(r, k, body[k])
        r.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(r)
        return _c(db, r)
    finally:
        db.close()
@router.get("/api/campaigns/{cid}/journeys")
def list_journeys(cid: str):
    db = SessionLocal()
    try:
        rows = db.query(Journey).filter(Journey.campaign_id == cid).order_by(Journey.created_at.asc()).all()
        return [_j(db, r) for r in rows]
    finally:
        db.close()
@router.get("/api/campaigns/{cid}/journey")
def get_journey(cid: str):
    db = SessionLocal()
    try:
        r = db.query(Journey).filter(Journey.campaign_id == cid).order_by(Journey.created_at.asc()).first()
        if not r:
            return Response(status_code=204)
        return _j(db, r)
    finally:
        db.close()
def _notify_graph_changed(campaign_id, journey_id, version):
    try:
        import asyncio

        from app.routers.sessions import graph_cache
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(graph_cache.invalidate(journey_id, version))
        except Exception:
            pass
    except Exception:
        pass
@router.put("/api/campaigns/{cid}/journey")
def upsert_journey(cid: str, body: dict):
    db = SessionLocal()
    try:
        if not db.query(Campaign).filter(Campaign.id == cid).first():
            raise HTTPException(404, "not found")
        raw = body.get("graph", body)
        try:
            new_json = G.serialize(raw)
        except G.BadGraphException as e:
            raise HTTPException(400, str(e))
        existing = db.query(Journey).filter(Journey.campaign_id == cid).order_by(Journey.created_at.asc()).first()
        is_new = existing is None
        old_json = existing.graph_json if existing else None
        if is_new:
            j = Journey(campaign_id=cid, name=str(body.get("name", "Journey")), graph_json=new_json, version=1)
            db.add(j)
            db.commit()
            db.refresh(j)
        else:
            if "name" in body:
                existing.name = str(body["name"])
            existing.graph_json = new_json
            existing.version = (existing.version or 1) + 1
            existing.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(existing)
            j = existing
        if is_new or not G.is_style_only_diff(old_json, new_json):
            _notify_graph_changed(cid, j.id, j.version)
        return _j(db, j)
    finally:
        db.close()
@router.post("/api/campaigns/{cid}/journey/validate")
def validate_journey(cid: str, body: dict = None):
    db = SessionLocal()
    try:
        if body and ("graph" in body or "nodes" in body):
            try:
                gj = G.serialize(body.get("graph", body))
            except G.BadGraphException as e:
                raise HTTPException(400, str(e))
        else:
            r = db.query(Journey).filter(Journey.campaign_id == cid).order_by(Journey.created_at.asc()).first()
            gj = r.graph_json if r else "{}"
        errs = G.validate(gj)
        return {"valid": all(e["severity"] == "warning" for e in errs) if errs else True, "errors": errs}
    finally:
        db.close()
@router.post("/api/campaigns/{cid}/journey/publish")
def publish_journey(cid: str):
    db = SessionLocal()
    try:
        r = db.query(Journey).filter(Journey.campaign_id == cid).order_by(Journey.created_at.asc()).first()
        if not r:
            raise HTTPException(404, "not found")
        errs = G.validate(r.graph_json or "{}")
        blocking = [e for e in errs if e["severity"] != "warning"]
        if blocking:
            raise HTTPException(400, {"valid": False, "errors": blocking})
        r.status = "PUBLISHED"
        r.version = (r.version or 1) + 1
        r.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(r)
        _notify_graph_changed(cid, r.id, r.version)
        return _j(db, r)
    finally:
        db.close()
@router.get("/api/campaigns/{cid}/journey/graph-version")
def graph_version(cid: str):
    db = SessionLocal()
    try:
        r = db.query(Journey).filter(Journey.campaign_id == cid).order_by(Journey.created_at.asc()).first()
        if not r:
            raise HTTPException(404, "not found")
        return {"journeyId": r.id, "campaignId": cid, "version": r.version, "status": r.status, "updatedAt": r.updated_at.isoformat() if r.updated_at else ""}
    finally:
        db.close()
@router.post("/api/campaigns/{cid}/journey/validate-field")
def validate_field(cid: str, body: dict):
    db = SessionLocal()
    try:
        if not db.query(Campaign).filter(Campaign.id == cid).first():
            raise HTTPException(404, "not found")
        fk = body.get("fieldKey")
        val = body.get("value")
        if fk is None or val is None:
            raise HTTPException(400, "fieldKey and value are required")
        exists = db.query(FieldValue).filter(FieldValue.campaign_id == cid, FieldValue.field_key == fk, FieldValue.value == val).first() is not None
        if not exists:
            try:
                db.add(FieldValue(campaign_id=cid, field_key=fk, value=val))
                db.commit()
            except Exception:
                db.rollback()
                exists = True
        return {"unique": not exists}
    finally:
        db.close()
@router.delete("/api/campaigns/{cid}/journeys/{jid}", status_code=204)
def delete_journey(cid: str, jid: str):
    db = SessionLocal()
    try:
        r = db.query(Journey).filter(Journey.id == jid).first()
        if not r or r.campaign_id != cid:
            raise HTTPException(404, "not found")
        db.delete(r)
        db.commit()
        return Response(status_code=204)
    finally:
        db.close()
@router.post("/journey-engine/events/ai-actions")
@router.post("/api/journey-engine/events/ai-actions")
def ai_actions(body: dict):
    db = SessionLocal()
    try:
        e = ActivityEvent(campaign_id=str(body.get("campaignId", body.get("campaign_id", "unknown"))), type=str(body.get("type", "ai_action")), payload_json=json.dumps(body), request_id=body.get("requestId", body.get("request_id", get_request_id())))
        db.add(e)
        db.commit()
        return {"ok": True}
    finally:
        db.close()
@router.get("/api/campaigns/{cid}/activity")
def activity(cid: str):
    db = SessionLocal()
    try:
        rows = db.query(ActivityEvent).filter(ActivityEvent.campaign_id == cid).order_by(ActivityEvent.created_at.desc()).all()
        out = []
        for r in rows:
            try:
                payload = json.loads(r.payload_json or "{}")
            except Exception:
                payload = r.payload_json
            out.append({"id": r.id, "campaignId": r.campaign_id, "type": r.type, "payload": payload, "payloadJson": r.payload_json, "requestId": r.request_id, "createdAt": r.created_at.isoformat() if r.created_at else None})
        return out
    finally:
        db.close()
@router.get("/api/campaigns/{cid}/dev-link")
def dev_link(cid: str):
    db = SessionLocal()
    try:
        r = db.query(Campaign).filter(Campaign.id == cid).first()
        if not r:
            raise HTTPException(404, "not found")
        if not r.dev_token:
            r.dev_token = str(uuid.uuid4())
            r.dev_token_created_at = datetime.utcnow()
            db.commit()
            db.refresh(r)
        return {"devToken": r.dev_token, "devLink": f"/d/{r.dev_token}", "createdAt": r.dev_token_created_at.isoformat() if r.dev_token_created_at else "", "campaignId": r.id}
    finally:
        db.close()
@router.post("/api/campaigns/{cid}/dev-link/rotate")
def rotate_dev_link(cid: str):
    db = SessionLocal()
    try:
        r = db.query(Campaign).filter(Campaign.id == cid).first()
        if not r:
            raise HTTPException(404, "not found")
        r.dev_token = str(uuid.uuid4())
        r.dev_token_created_at = datetime.utcnow()
        db.commit()
        db.refresh(r)
        return {"devToken": r.dev_token, "devLink": f"/d/{r.dev_token}", "createdAt": r.dev_token_created_at.isoformat(), "campaignId": r.id}
    finally:
        db.close()
