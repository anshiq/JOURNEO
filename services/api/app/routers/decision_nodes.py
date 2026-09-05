from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, Any
from app.graphs.decision_node_graph import decision_graph

router=APIRouter(prefix="/v1/decision-nodes", tags=["decision-nodes"])

class ExecuteReq(BaseModel):
    journey_id: str
    node_id: str
    subtype: str
    campaign_id: str
    context: Any

@router.post("/execute")
async def execute(req: ExecuteReq):
    state={"journey_id":req.journey_id,"node_id":req.node_id,"subtype":req.subtype,"campaign_id":req.campaign_id,"context":req.context if isinstance(req.context, dict) else {"raw":req.context},"attempt":1,"max_attempts":2,"confidence":0.5}
    res=await decision_graph.ainvoke(state)
    return {"outcome":res.get("outcome"),"branch":res.get("branch","default"),"used_fallback":res.get("used_fallback",False),"attempts":res.get("attempt",1),"confidence":res.get("confidence",0.5),"kb_results":res.get("kb_results")}
