from sqlalchemy import Column, Integer, String, Text, DateTime, Float, JSON
from datetime import datetime
from app.db.session import Base
class AnomalyEvent(Base):
    __tablename__="anomaly_events"
    id=Column(Integer, primary_key=True, autoincrement=True)
    campaign_id=Column(String)
    metric=Column(String)
    severity=Column(String) # low|medium|critical
    stats_details=Column(JSON)
    llm_root_cause=Column(Text)
    guardrail_status=Column(String)
    action_taken=Column(String)
    proposal_id=Column(Integer, nullable=True)
    created_at=Column(DateTime, default=datetime.utcnow)
