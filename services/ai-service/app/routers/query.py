from fastapi import APIRouter
from pydantic import BaseModel
from typing import Any, Optional
from app.graphs.subflows.query_resolve_subflow import query_resolve_graph

router = APIRouter(prefix="/v1/query", tags=["query"])


class QueryResolveReq(BaseModel):
    query: str
    journeyGraph: Optional[Any] = None
    journey_id: Optional[str] = "unknown"
    campaign_id: Optional[str] = "unknown"
    node_id: Optional[str] = "ask_ai"
    k: Optional[int] = 4
    config: Optional[Any] = None


@router.post("/resolve")
async def resolve(req: QueryResolveReq):
    cfg = req.config if isinstance(req.config, dict) else {}
    if req.k and "ragK" not in cfg:
        cfg["ragK"] = req.k
    state = {
        "journey_id": req.journey_id or "unknown",
        "node_id": req.node_id or "ask_ai",
        "subtype": "query_resolve",
        "campaign_id": req.campaign_id or "unknown",
        "context": {"query": req.query},
        "query": req.query,
        "journey_graph": req.journeyGraph or {"nodes": [], "edges": []},
        "config": cfg,
        "attempt": 1,
        "max_attempts": 2,
        "confidence": 0.5,
    }
    res = await query_resolve_graph.ainvoke(state)
    return {
        "decision": res.get("decision", "reject"),
        "branch": res.get("branch", "rejected"),
        "targetNodeId": res.get("target_node_id"),
        "targetNodeType": res.get("target_node_type"),
        "targetNodeSummary": res.get("target_node_summary"),
        "targetNodeDetails": res.get("target_node_details"),
        "answer": res.get("answer") or res.get("outcome"),
        "citations": res.get("citations", []),
        "confidence": res.get("confidence", 0.5),
        "reason": res.get("reason", ""),
        "usedFallback": res.get("used_fallback", False),
    }
