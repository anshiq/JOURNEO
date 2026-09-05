from sqlalchemy import Column, Integer, String, Text, DateTime, Float, JSON
from datetime import datetime
from app.db.session import Base
class ActionProposal(Base):
    __tablename__="action_proposals"
    id=Column(Integer, primary_key=True, autoincrement=True)
    source=Column(String) # optimizer|studio_ai_chat|anomaly_detector
    campaign_id=Column(String)
    proposed_action=Column(JSON) # {platform, subtype, params}
    rationale=Column(Text)
    confidence=Column(Float)
    estimated_impact=Column(String)
    guardrail_status=Column(String) # pass|flag|reject
    guardrail_details=Column(Text)
    status=Column(String, default="pending") # pending|approved|rejected|executed
    source_analytics_snapshot=Column(JSON)
    request_id=Column(String)
    created_at=Column(DateTime, default=datetime.utcnow)
    updated_at=Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
