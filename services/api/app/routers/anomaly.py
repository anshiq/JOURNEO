import json

from fastapi import APIRouter, HTTPException

from app.connectors.registry import dispatch
from app.db.models.anomaly import AnomalyEvent
from app.db.models.journey import ActivityEvent
from app.db.models.proposals import ActionProposal
from app.db.session import SessionLocal
from app.graphs.anomaly_graph import anomaly_graph
from app.middleware.request_context import get_request_id

router=APIRouter(prefix="/v1/anomaly", tags=["anomaly"])
def _activity(db, cid, kind, payload, rid):
    db.add(ActivityEvent(campaign_id=cid, type=kind, payload_json=json.dumps(payload), request_id=rid))
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
    ev=AnomalyEvent(campaign_id=cid, metric=cands[0].get("metric","cpa"), severity=severity, stats_details={"candidates":cands}, llm_root_cause=llm_rc, guardrail_status=guard_status, action_taken=action)
    db.add(ev); db.flush()
    proposal_id=None
    result=None
    rid=payload.get("requestId") or payload.get("request_id") or get_request_id()
    if action=="auto_pause" and guard_status!="reject":
        try:
            res=await dispatch("meta","pause_campaign",{"platform":"meta","campaignId":cid})
            ev.action_taken="auto_paused"
            _activity(db, cid, "anomaly_auto_pause", {"root_cause":llm_rc,"candidates":cands}, rid)
            result=res
        except Exception as e:
            result={"error":str(e)}
    else:
        prop=ActionProposal(source="anomaly_detector", campaign_id=cid, proposed_action={"platform":"meta","subtype":"pause_campaign","params":{"platform":"meta","campaignId":cid}}, rationale=llm_rc or f"Anomaly: {cands[0].get('type')}", confidence=0.8 if severity=="critical" else 0.6, estimated_impact="high", guardrail_status=guard_status, guardrail_details=json.dumps(guard_res[0].get("details",{}) if guard_res else {}), status="pending", source_analytics_snapshot={"candidates":cands}, request_id=rid)
        db.add(prop); db.flush()
        proposal_id=prop.id
        ev.proposal_id=proposal_id
        _activity(db, cid, "anomaly_queued", {"candidates":cands}, rid)
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
