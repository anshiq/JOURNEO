from fastapi import APIRouter

from app.db.models.request_log import RequestLog
from app.db.session import SessionLocal

router = APIRouter()
@router.get("/api/trace/{rid}")
def trace(rid: str):
    db = SessionLocal()
    try:
        rows = db.query(RequestLog).filter(RequestLog.request_id == rid).order_by(RequestLog.created_at.asc()).all()
        spans = [{"service": "api", "requestId": r.request_id, "method": r.method, "path": r.path, "status": r.status, "durationMs": r.duration_ms, "factsJson": r.facts_json, "createdAt": r.created_at.isoformat() if r.created_at else None} for r in rows]
        return {"requestId": rid, "spans": spans}
    finally:
        db.close()
