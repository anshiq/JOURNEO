from langgraph.graph import StateGraph, END
from typing import TypedDict
from app.connectors.java_catalog_client import get_catalog
from app.guardrails.numeric_grounding import guardrail_check_snapshot
from app.config import settings
import httpx, statistics

class AnomalyState(TypedDict, total=False):
    campaign_id: str
    candidates: list
    llm_root_cause: str
    guardrail_results: list
    severity: str
    action: str

def stats_candidates(events):
    # events: list of DeliveryEvent-like dicts with date, cpa, ctr, frequency
    # compute rolling z-score on CPA/CTR/spend and creative fatigue rule
    cands=[]
    if len(events)<7: return cands
    # creative fatigue: frequency up >=20% AND ctr down >=15% between first and second half of trailing 7d
    last7=events[-7:]
    first3=last7[:3]; last3=last7[-3:]
    avg_freq_first=sum(e["frequency"] for e in first3)/len(first3)
    avg_freq_last=sum(e["frequency"] for e in last3)/len(last3)
    avg_ctr_first=sum(e["ctr"] for e in first3)/len(first3)
    avg_ctr_last=sum(e["ctr"] for e in last3)/len(last3)
    if avg_freq_first>0 and avg_freq_last/avg_freq_first >=1.2 and avg_ctr_first>0 and (avg_ctr_first-avg_ctr_last)/avg_ctr_first >=0.15:
        cands.append({"type":"creative_fatigue","metric":"ctr","severity":"medium","details":{"freq_first":avg_freq_first,"freq_last":avg_freq_last,"ctr_first":avg_ctr_first,"ctr_last":avg_ctr_last}})
    # CPA spike: z-score
    cpas=[e["cpa"] for e in events[-14:]]
    if len(cpas)>=7:
        mean=statistics.mean(cpas[:-2]); stdev=statistics.pstdev(cpas[:-2]) or 1
        z=(cpas[-1]-mean)/stdev if stdev else 0
        if z>2:
            cands.append({"type":"cpa_spike","metric":"cpa","severity":"critical" if z>3 else "medium","details":{"z":z,"last_cpa":cpas[-1],"mean":mean}})
    # CTR drop
    ctrs=[e["ctr"] for e in events[-14:]]
    if len(ctrs)>=7:
        mean=statistics.mean(ctrs[:-2]); stdev=statistics.pstdev(ctrs[:-2]) or 0.2
        z=(ctrs[-1]-mean)/stdev if stdev else 0
        if z < -2:
            cands.append({"type":"ctr_drop","metric":"ctr","severity":"medium","details":{"z":z,"last_ctr":ctrs[-1]}})
    return cands

async def fetch_and_detect(state: AnomalyState):
    cid=state["campaign_id"]
    # fetch series from analytics
    async with httpx.AsyncClient(timeout=5) as c:
        try:
            r=await c.get(f"{settings.analytics_service_url}/api/analytics/campaigns/{cid}/reach?from=2024-01-01")
            data=r.json()
            series=data.get("series",[])
            # need frequency, ctr, cpa per day
            events=[{"date":s["date"],"cpa":s["cpa"],"ctr":s["ctr"],"frequency":s["frequency"],"spend":s["spend"]} for s in series]
        except Exception as e:
            events=[]
    cands=stats_candidates(events)
    return {"candidates":cands}

async def llm_root_cause(state: AnomalyState):
    cands=state.get("candidates",[])
    if not cands: return {"llm_root_cause":"No anomalies"}
    from app.llm.client import get_llm, llm_available
    from app.connectors.java_catalog_client import get_catalog, format_catalog_context
    snap=await get_catalog(state["campaign_id"])
    ctx=format_catalog_context(snap)
    prompt=f"Given candidates {cands} and catalog {ctx}, explain root cause in 2 sentences, include numbers exactly as in catalog."
    if not llm_available():
        rc="; ".join([c["type"]+": "+str(c["details"]) for c in cands])
        return {"llm_root_cause":rc}
    try:
        llm=get_llm()
        res=await llm.ainvoke(prompt)
        return {"llm_root_cause":res.content[:500]}
    except Exception as e:
        return {"llm_root_cause":str(cands)}

async def guardrail(state: AnomalyState):
    cands=state.get("candidates",[])
    rc=state.get("llm_root_cause","")
    # use snapshot numbers for grounding
    from app.connectors.java_catalog_client import get_catalog
    snap=await get_catalog(state["campaign_id"])
    res=guardrail_check_snapshot(snap, [{"rationale":rc}], mode=settings.guardrail_mode)
    return {"guardrail_results":res}

def route_severity(state: AnomalyState):
    cands=state.get("candidates",[])
    crit=any(c.get("severity")=="critical" for c in cands)
    guard_pass=all(r["guardrail_status"]!="reject" for r in state.get("guardrail_results",[]))
    if crit and guard_pass: return "auto_pause"
    return "queue"

async def auto_pause(state: AnomalyState):
    # will be handled outside - just mark
    return {"action":"auto_pause"}
async def queue(state: AnomalyState):
    return {"action":"queue"}

from app.config import settings
g=StateGraph(AnomalyState)
g.add_node("fetch_and_detect", fetch_and_detect)
g.add_node("llm_cause_step", llm_root_cause)
g.add_node("guardrail", guardrail)
g.add_node("auto_pause", auto_pause)
g.add_node("queue", queue)
g.set_entry_point("fetch_and_detect")
g.add_conditional_edges("fetch_and_detect", lambda s: "llm" if s.get("candidates") else "end", {"llm":"llm_cause_step","end":END})
g.add_edge("llm_cause_step","guardrail")
g.add_conditional_edges("guardrail", route_severity, {"auto_pause":"auto_pause","queue":"queue"})
g.add_edge("auto_pause", END)
g.add_edge("queue", END)
anomaly_graph=g.compile()
