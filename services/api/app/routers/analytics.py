from fastapi import APIRouter, Query

from app.db.models.analytics import ClickEvent, LlmUsageEvent, MetricDefinition
from app.db.session import SessionLocal
from app.middleware.request_context import put_fact
from app.modules.analytics import service as S

router = APIRouter()
@router.get("/api/analytics/campaigns/{cid}/reach")
def reach(cid: str, from_date: str = Query(default=None, alias="from"), to: str = Query(default=None, alias="to")):
    db = SessionLocal()
    try:
        return S.reach(db, cid, from_date, to)
    finally:
        db.close()
@router.get("/api/analytics/campaigns/{cid}/metrics")
def metrics(cid: str, from_date: str = Query(default=None, alias="from"), to: str = Query(default=None, alias="to")):
    db = SessionLocal()
    try:
        return S.reach(db, cid, from_date, to)
    finally:
        db.close()
@router.post("/api/analytics/llm-usage")
def log_usage(body: dict):
    db = SessionLocal()
    try:
        e = LlmUsageEvent(request_id=body.get("requestId"), campaign_id=body.get("campaignId", body.get("campaign_id")), agent_type=str(body.get("agentType", "unknown")), model=str(body.get("model", "unknown")), prompt_tokens=int(body.get("promptTokens", 0) or 0), completion_tokens=int(body.get("completionTokens", 0) or 0), cost_usd=float(body.get("costUsd", 0) or 0))
        db.add(e)
        db.commit()
        db.refresh(e)
        put_fact("llmUsage", e.agent_type)
        return {"id": e.id, "requestId": e.request_id, "campaignId": e.campaign_id, "agentType": e.agent_type, "model": e.model, "promptTokens": e.prompt_tokens, "completionTokens": e.completion_tokens, "costUsd": e.cost_usd}
    finally:
        db.close()
@router.post("/api/analytics/click")
def log_click(body: dict):
    db = SessionLocal()
    try:
        e = ClickEvent(campaign_id=body.get("campaignId"), event_name=str(body.get("eventName", "unknown")), session_id=body.get("sessionId"))
        db.add(e)
        db.commit()
        db.refresh(e)
        return {"id": e.id, "campaignId": e.campaign_id, "eventName": e.event_name, "sessionId": e.session_id}
    finally:
        db.close()
@router.get("/api/analytics/llm-cost")
def llm_cost(campaignId: str = Query(default=None), campaign_id: str = Query(default=None, alias="campaignId", include_in_schema=False)):
    cid = campaignId or campaign_id
    db = SessionLocal()
    try:
        q = db.query(LlmUsageEvent)
        if cid:
            q = q.filter(LlmUsageEvent.campaign_id == cid)
        all_rows = q.all()
        total = sum(r.cost_usd or 0 for r in all_rows)
        tokens = sum((r.prompt_tokens or 0) + (r.completion_tokens or 0) for r in all_rows)
        by_agent = {}
        for r in all_rows:
            by_agent[r.agent_type or "unknown"] = by_agent.get(r.agent_type or "unknown", 0) + (r.cost_usd or 0)
        return {"totalCostUsd": total, "totalTokens": tokens, "byAgent": by_agent, "count": len(all_rows)}
    finally:
        db.close()
@router.get("/catalog/metrics/definitions")
def defs():
    db = SessionLocal()
    try:
        rows = db.query(MetricDefinition).all()
        return [{"key": r.key, "label": r.label, "definition": r.definition, "unit": r.unit, "formula": r.formula} for r in rows]
    finally:
        db.close()
@router.get("/catalog/metrics/{cid}")
def catalog(cid: str, metrics: str = Query(default=None), from_date: str = Query(default=None, alias="from"), to: str = Query(default=None, alias="to")):
    db = SessionLocal()
    try:
        return S.catalog(db, cid, metrics, from_date, to)
    finally:
        db.close()
