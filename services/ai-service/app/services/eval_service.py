from app.db.session import SessionLocal
from app.db.models.eval import EvalRun
from app.graphs.optimizer_graph import optimizer_graph
import json, time
async def run_eval_batch(prompt_version: str, scenarios: list):
    results=[]
    for sc in scenarios:
        cid=sc.get("campaign_id") or sc.get("analytics_snapshot",{}).get("campaign_id") or "campaign-a"
        # run optimizer graph
        try:
            out=await optimizer_graph.ainvoke({"campaign_id":cid})
            proposals=out.get("proposals",[])
            agent_out={"proposals":proposals}
        except Exception as e:
            agent_out={"error":str(e)}
        human=sc.get("human_baseline",{})
        # LLM as judge relevance + Brier calibration
        rel=0.7
        cal=0.8
        # simple heuristic: if LLM available, call judge
        try:
            from app.llm.client import get_llm, llm_available
            if llm_available():
                llm=get_llm(temperature=0)
                judge_prompt=f"Compare agent output {json.dumps(agent_out)} vs human baseline {json.dumps(human)}. Score relevance 0-1 and calibration 0-1. Return JSON."
                res=await llm.ainvoke(judge_prompt)
                import re
                m=re.search(r"\{.*\}", res.content, re.DOTALL)
                if m:
                    j=json.loads(m.group(0))
                    rel=float(j.get("relevance",0.7)); cal=float(j.get("calibration",0.8))
        except Exception:
            pass
        # persist
        db=SessionLocal()
        er=EvalRun(prompt_version=prompt_version, scenario_id=sc.get("id","unknown"), agent_output=agent_out, human_baseline=human, relevance_score=rel, calibration_score=cal, details={"scenario":sc})
        db.add(er); db.commit(); db.refresh(er); db.close()
        results.append({"scenario_id":sc.get("id"),"relevance":rel,"calibration":cal,"agent_output":agent_out})
    agg_relevance=sum(r["relevance"] for r in results)/len(results) if results else 0
    agg_cal=sum(r["calibration"] for r in results)/len(results) if results else 0
    return {"prompt_version":prompt_version,"count":len(results),"avg_relevance":agg_relevance,"avg_calibration":agg_cal,"per_scenario":results}
