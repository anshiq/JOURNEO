from fastapi import APIRouter, HTTPException
from app.graphs.anomaly_graph import anomaly_graph
from app.db.session import SessionLocal
from app.db.models.anomaly import AnomalyEvent
from app.db.models.proposals import ActionProposal
from app.connectors.registry import dispatch
from app.config import settings
import json, httpx

router=APIRouter(prefix="/v1/anomaly", tags=["anomaly"])

@router.post("/scan")
async def scan(payload: dict):
    cid=payload.get("campaign_id") or payload.get("campaignId")
    if not cid: raise HTTPException(400,"campaign_id required")
    out=await anomaly_graph.ainvoke({"campaign_id":cid})
    cands=out.get("candidates",[])
    if not cands:
        return {"campaign_id":cid,"anomalies":[],"action":"none"}
    llm_rc=out.get("llm_root_cause","")
    guard_res=out.get("guardrail_results",[])
    guard_status=guard_res[0].get("guardrail_status") if guard_res else "pass"
    severity="critical" if any(c.get("severity")=="critical" for c in cands) else "medium"
    action=out.get("action","queue")
    db=SessionLocal()
    # persist AnomalyEvent
    ev=AnomalyEvent(campaign_id=cid, metric=cands[0].get("metric","cpa"), severity=severity, stats_details={"candidates":cands}, llm_root_cause=llm_rc, guardrail_status=guard_status, action_taken=action)
    db.add(ev); db.flush()
    proposal_id=None
    result=None
    if action=="auto_pause" and guard_status!="reject":
        # direct auto-pause via dispatcher
        try:
            res=await dispatch("meta","pause_campaign",{"platform":"meta","campaignId":cid})
            ev.action_taken="auto_paused"
            # also create audit via connectors already
            # notify journey-service webhook
            try:
                async with httpx.AsyncClient(timeout=3) as c:
                    await c.post(f"{settings.journey_service_url}/journey-engine/events/ai-actions", json={"campaignId":cid,"type":"anomaly_auto_pause","payload":{"root_cause":llm_rc,"candidates":cands},"requestId":payload.get("requestId","")})
            except: pass
            result=res
        except Exception as e:
            result={"error":str(e)}
    else:
        # queue to approval
        prop=ActionProposal(source="anomaly_detector", campaign_id=cid, proposed_action={"platform":"meta","subtype":"pause_campaign","params":{"platform":"meta","campaignId":cid}}, rationale=llm_rc or f"Anomaly: {cands[0].get('type')}", confidence=0.8 if severity=="critical" else 0.6, estimated_impact="high", guardrail_status=guard_status, guardrail_details=json.dumps(guard_res[0].get("details",{}) if guard_res else {}), status="pending", source_analytics_snapshot={"candidates":cands}, request_id=payload.get("requestId",""))
        db.add(prop); db.flush()
        proposal_id=prop.id
        ev.proposal_id=proposal_id
        # notify journey-service
        try:
            async with httpx.AsyncClient(timeout=3) as c:
                await c.post(f"{settings.journey_service_url}/journey-engine/events/ai-actions", json={"campaignId":cid,"type":"anomaly_queued","payload":{"candidates":cands},"requestId":payload.get("requestId","")})
        except: pass
    db.commit(); db.refresh(ev); db.close()
    return {"campaign_id":cid,"anomalies":cands,"root_cause":llm_rc,"guardrail_status":guard_status,"action":action,"proposal_id":proposal_id,"anomaly_id":ev.id,"result":result}

@router.get("/events")
async def list_events(campaign_id: str = None):
    db=SessionLocal()
    q=db.query(AnomalyEvent)
    if campaign_id: q=q.filter(AnomalyEvent.campaign_id==campaign_id)
    rows=q.order_by(AnomalyEvent.created_at.desc()).limit(50).all()
    out=[{"id":r.id,"campaign_id":r.campaign_id,"metric":r.metric,"severity":r.severity,"stats_details":r.stats_details,"llm_root_cause":r.llm_root_cause,"guardrail_status":r.guardrail_status,"action_taken":r.action_taken,"proposal_id":r.proposal_id,"created_at":r.created_at.isoformat() if r.created_at else None} for r in rows]
    db.close()
    return out
