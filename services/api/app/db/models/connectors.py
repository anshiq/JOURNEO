from sqlalchemy import Column, Integer, String, Text, DateTime, Float
from datetime import datetime
from app.db.session import Base
import uuid
def _uuid():
    return str(uuid.uuid4())
class MockCampaign(Base):
    __tablename__ = "mock_campaigns"
    id = Column(String, primary_key=True, default=_uuid)
    platform = Column(String, index=True)
    external_id = Column(String, index=True)
    name = Column(String, default="Untitled")
    raw_json = Column(Text, nullable=True)
    status = Column(String, default="ACTIVE")
    daily_budget = Column(Float, default=100)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
class AuditLogEntry(Base):
    __tablename__ = "audit_log"
    id = Column(String, primary_key=True, default=_uuid)
    actor = Column(String, index=True, nullable=True)
    platform = Column(String, nullable=True)
    action_type = Column(String, nullable=True)
    campaign_id = Column(String, index=True, nullable=True)
    before_state = Column(Text, nullable=True)
    after_state = Column(Text, nullable=True)
    request_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
