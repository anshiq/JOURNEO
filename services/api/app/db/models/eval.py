from sqlalchemy import Column, Integer, String, Text, DateTime, Float, JSON
from datetime import datetime
from app.db.session import Base
class EvalRun(Base):
    __tablename__="eval_runs"
    id=Column(Integer, primary_key=True, autoincrement=True)
    prompt_version=Column(String)
    scenario_id=Column(String)
    agent_output=Column(JSON)
    human_baseline=Column(JSON)
    relevance_score=Column(Float)
    calibration_score=Column(Float)
    details=Column(JSON)
    created_at=Column(DateTime, default=datetime.utcnow)
