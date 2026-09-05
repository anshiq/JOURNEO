from langgraph.graph import StateGraph, END
from typing import TypedDict
from app.connectors.java_catalog_client import get_catalog, format_catalog_context
from app.llm.client import get_llm, llm_available
from app.guardrails.numeric_grounding import guardrail_check_snapshot
from app.config import settings
import json, httpx

class OptState(TypedDict, total=False):
    campaign_id: str
    analytics_snapshot: dict
    catalog_context: str
    proposals: list
    guardrail_results: list
    fallback_used: bool

async def fetch_analytics(state: OptState):
    snap=await get_catalog(state["campaign_id"])
    ctx=format_catalog_context(snap)
    return {"analytics_snapshot":snap,"catalog_context":ctx}

async def generate_proposals(state: OptState):
    snap=state["analytics_snapshot"]; ctx=state["catalog_context"]
    if not llm_available():
        # deterministic fallback proposals
        cpa=next((m["value"] for m in snap.get("metrics",[]) if m["key"]=="cpa"), 20)
        ctr=next((m["value"] for m in snap.get("metrics",[]) if m["key"]=="ctr"), 1.2)
        proposals=[]
        if cpa>25:
            proposals.append({"platform":"meta","action":"pause_campaign","params":{"campaignId":state["campaign_id"]},"rationale":f"CPA {cpa} exceeds threshold 25, pause to prevent waste","confidence":0.85,"estimated_impact":"high"})
        if ctr<1.0:
            proposals.append({"platform":"meta","action":"reallocate_budget","params":{"fromCampaign":state["campaign_id"],"toCampaign":"campaign-a","amount":500},"rationale":f"CTR {ctr} below 1.0 indicates creative fatigue, reallocate budget","confidence":0.7,"estimated_impact":"medium"})
        if not proposals:
            proposals.append({"platform":"google","action":"reallocate_budget","params":{"fromCampaign":state["campaign_id"],"toCampaign":"campaign-b","amount":300},"rationale":f"Reallocate from {state['campaign_id']} to higher ROAS campaign","confidence":0.6,"estimated_impact":"medium"})
        return {"proposals":proposals}
    # LLM path - force function calling
    try:
        from langchain_core.tools import tool
        import json as js
        prompt=open("app/llm/prompts/optimizer_reasoning/v1.txt").read().format(metrics=json.dumps(snap), catalog=ctx)
        llm=get_llm()
        # bind tool for structured output
        # We'll do direct prompt without tool binding for simplicity
        res=await llm.ainvoke(prompt + "\nReturn JSON list of proposals with fields platform, action, params, rationale, confidence, estimated_impact")
        txt=res.content
        # try parse JSON
        import re
        m=re.search(r"\[.*\]", txt, re.DOTALL)
        if m:
            proposals=json.loads(m.group(0))
        else:
            proposals=[]
        return {"proposals":proposals}
    except Exception as e:
        return {"proposals":[]}

async def guardrail_check(state: OptState):
    snap=state["analytics_snapshot"]; props=state.get("proposals",[])
    results=guardrail_check_snapshot(snap, props, mode=settings.guardrail_mode)
    return {"guardrail_results":results}

def route_guardrail(state: OptState):
    results=state.get("guardrail_results",[])
    if not results: return "fallback"
    # if every proposal fails (reject), go to fallback_deterministic
    all_fail=all(r["guardrail_status"]=="reject" for r in results)
    if all_fail and len(results)>0: return "fallback"
    return "persist"

async def fallback_node(state: OptState):
    # deterministic ranking fallback
    snap=state["analytics_snapshot"]
    cpa=next((m["value"] for m in snap.get("metrics",[]) if m["key"]=="cpa"), 20)
    props=[{"platform":"meta","action":"pause_campaign","params":{"campaignId":state["campaign_id"]},"rationale":f"Deterministic fallback: CPA {cpa}","confidence":0.6,"estimated_impact":"medium"}]
    results=guardrail_check_snapshot(snap, props, mode="flag")
    return {"proposals":props,"guardrail_results":results,"fallback_used":True}

async def persist_node(state: OptState):
    return {"proposals": state.get("proposals",[])}

g=StateGraph(OptState)
g.add_node("fetch_analytics", fetch_analytics)
g.add_node("generate_proposals", generate_proposals)
g.add_node("guardrail_check", guardrail_check)
g.add_node("fallback_deterministic_ranking", fallback_node)
g.add_node("persist_proposals", persist_node)
g.set_entry_point("fetch_analytics")
g.add_edge("fetch_analytics","generate_proposals")
g.add_edge("generate_proposals","guardrail_check")
g.add_conditional_edges("guardrail_check", route_guardrail, {"fallback":"fallback_deterministic_ranking","persist":"persist_proposals"})
g.add_edge("fallback_deterministic_ranking","persist_proposals")
g.add_edge("persist_proposals", END)
optimizer_graph=g.compile()
