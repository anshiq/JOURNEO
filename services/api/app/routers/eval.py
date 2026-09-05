from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from app.services.eval_service import run_eval_batch
from app.db.session import SessionLocal
from app.db.models.eval import EvalRun
import json, pathlib

router=APIRouter(prefix="/v1/eval", tags=["eval"])

class EvalReq(BaseModel):
    prompt_version: str = "v1"
    scenarios: Optional[List[dict]] = None

@router.post("/runs")
async def create_run(req: EvalReq):
    scenarios=req.scenarios
    if not scenarios:
        # load fixtures
        p=pathlib.Path("tests/fixtures/eval_scenarios")
        scenarios=[]
        if p.exists():
            for f in p.glob("*.json"):
                try: scenarios.append(json.loads(f.read_text()))
                except: pass
        if not scenarios:
            scenarios=[
                {"id":"sc1","campaign_id":"campaign-a","human_baseline":{"proposals":[{"action":"reallocate_budget","rationale":"shift budget to high ROAS"}]}},
                {"id":"sc2","campaign_id":"campaign-d","human_baseline":{"proposals":[{"action":"pause_campaign","rationale":"low ctr creative fatigue"}]}},
            ]
    res=await run_eval_batch(req.prompt_version, scenarios)
    return res

@router.get("/runs")
async def list_runs():
    db=SessionLocal()
    rows=db.query(EvalRun).order_by(EvalRun.created_at.desc()).limit(50).all()
    out=[{"id":r.id,"prompt_version":r.prompt_version,"scenario_id":r.scenario_id,"relevance_score":r.relevance_score,"calibration_score":r.calibration_score,"created_at":r.created_at.isoformat() if r.created_at else None,"agent_output":r.agent_output,"human_baseline":r.human_baseline} for r in rows]
    db.close()
    return out
