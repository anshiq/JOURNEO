from fastapi import APIRouter, Query

from app.db.models.connectors import AuditLogEntry
from app.db.session import SessionLocal
from app.modules.connectors import service as S

router = APIRouter()
@router.post("/mock/meta/campaigns")
def create_meta(body: dict):
    db = SessionLocal()
    try:
        return S.create_meta(db, body)
    finally:
        db.close()
@router.post("/mock/meta/campaigns/{cid}/pause")
def pause_meta(cid: str, body: dict = None):
    db = SessionLocal()
    try:
        return S.pause_meta(db, cid, body or {})
    finally:
        db.close()
@router.post("/mock/meta/budget-reallocate")
def reallocate_meta(body: dict):
    db = SessionLocal()
    try:
        return S.reallocate_meta(db, body)
    finally:
        db.close()
@router.post("/mock/google/campaigns")
def create_google(body: dict):
    db = SessionLocal()
    try:
        return S.create_google(db, body)
    finally:
        db.close()
@router.post("/mock/google/campaigns/{cid}/pause")
def pause_google(cid: str):
    db = SessionLocal()
    try:
        return S.pause_google(db, cid)
    finally:
        db.close()
@router.post("/mock/whatsapp/broadcasts")
def create_whatsapp(body: dict):
    db = SessionLocal()
    try:
        return S.create_whatsapp(db, body)
    finally:
        db.close()
@router.get("/mock/{platform}/campaigns/{cid}")
def get_camp(platform: str, cid: str):
    db = SessionLocal()
    try:
        return S.get_campaign(db, platform, cid)
    finally:
        db.close()
@router.get("/audit-log")
def audit_log(campaignId: str = Query(default=None), actor: str = Query(default=None)):
    db = SessionLocal()
    try:
        q = db.query(AuditLogEntry)
        if campaignId:
            q = q.filter(AuditLogEntry.campaign_id == campaignId)
        elif actor:
            q = q.filter(AuditLogEntry.actor == actor)
        rows = q.order_by(AuditLogEntry.created_at.desc()).all()
        return [{"id": r.id, "actor": r.actor, "platform": r.platform, "actionType": r.action_type, "campaignId": r.campaign_id, "beforeState": r.before_state, "afterState": r.after_state, "requestId": r.request_id, "createdAt": r.created_at.isoformat() if r.created_at else None} for r in rows]
    finally:
        db.close()
