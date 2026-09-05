from fastapi import APIRouter, HTTPException
from app.graphs.optimizer_graph import optimizer_graph
from app.db.session import SessionLocal
from app.db.models.proposals import ActionProposal
from app.connectors.registry import dispatch
import json

router=APIRouter(prefix="/v1/optimizer", tags=["optimizer"])

@router.post("/analyze")
async def analyze(payload: dict):
    cid=payload.get("campaign_id") or payload.get("campaignId")
    if not cid: raise HTTPException(400,"campaign_id required")
    out=await optimizer_graph.ainvoke({"campaign_id":cid})
    proposals=out.get("proposals",[])
    guard_results=out.get("guardrail_results",[])
    # persist each as ActionProposal
    db=SessionLocal()
    created=[]
    snap=out.get("analytics_snapshot",{})
    for pr, gr in zip(proposals, guard_results) if guard_results else [(p, {"guardrail_status":"pass","details":{}}) for p in proposals]:
        prop=ActionProposal(source="optimizer", campaign_id=cid, proposed_action={"platform":pr.get("platform","meta"),"subtype":pr.get("action"),"params":pr.get("params",pr)}, rationale=pr.get("rationale",""), confidence=pr.get("confidence",0.6), estimated_impact=pr.get("estimated_impact","medium"), guardrail_status=gr.get("guardrail_status","pass"), guardrail_details=json.dumps(gr.get("details",{})), status="pending", source_analytics_snapshot=snap, request_id=payload.get("requestId",""))
        db.add(prop); db.flush()
        created.append({"id":prop.id,"platform":pr.get("platform"),"action":pr.get("action"),"rationale":pr.get("rationale"),"confidence":pr.get("confidence"),"impact":pr.get("estimated_impact"),"guardrail_status":gr.get("guardrail_status")})
    db.commit(); db.close()
    return {"campaign_id":cid,"proposals":created,"fallback_used":out.get("fallback_used",False)}

@router.get("/proposals")
async def list_proposals(status: str = None):
    db=SessionLocal()
    q=db.query(ActionProposal)
    if status: q=q.filter(ActionProposal.status==status)
    rows=q.order_by(ActionProposal.created_at.desc()).limit(100).all()
    out=[{"id":r.id,"source":r.source,"campaign_id":r.campaign_id,"proposed_action":r.proposed_action,"rationale":r.rationale,"confidence":r.confidence,"estimated_impact":r.estimated_impact,"guardrail_status":r.guardrail_status,"status":r.status,"created_at":r.created_at.isoformat() if r.created_at else None} for r in rows]
    db.close()
    return out

@router.post("/proposals/{pid}/approve")
async def approve(pid: int):
    db=SessionLocal()
    prop=db.query(ActionProposal).filter(ActionProposal.id==pid).first()
    if not prop: raise HTTPException(404,"not found")
    if prop.status!="pending": raise HTTPException(400,"already "+prop.status)
    prop.status="approved"
    db.commit()
    # execute via dispatcher (no LLM round trip needed - structured params already known)
    action=prop.proposed_action
    platform=action.get("platform","meta") if isinstance(action, dict) else "meta"
    subtype=action.get("subtype") or action.get("action")
    params=action.get("params",action)
    # dispatch
    try:
        res=await dispatch(platform, subtype, params if isinstance(params,dict) else {"campaignId":prop.campaign_id})
        prop.status="executed"
        db.commit()
        db.refresh(prop)
        result=res
    except Exception as e:
        result={"error":str(e)}
    db.close()
    return {"id":pid,"status":"executed","result":result}

@router.post("/proposals/{pid}/reject")
async def reject(pid: int):
    db=SessionLocal()
    prop=db.query(ActionProposal).filter(ActionProposal.id==pid).first()
    if not prop: raise HTTPException(404,"not found")
    prop.status="rejected"; db.commit(); db.close()
    return {"id":pid,"status":"rejected"}
