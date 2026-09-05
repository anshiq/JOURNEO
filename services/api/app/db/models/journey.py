from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Date, JSON
from datetime import datetime, date
from app.db.session import Base
import uuid
def _uuid():
    return str(uuid.uuid4())
class Campaign(Base):
    __tablename__ = "campaigns"
    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=False, default="Untitled")
    description = Column(Text, default="")
    objective = Column(Text, default="")
    audience = Column(Text, default="")
    status = Column(String, default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
    dev_token = Column(String, unique=True, default=_uuid)
    dev_token_created_at = Column(DateTime, default=datetime.utcnow)
class Journey(Base):
    __tablename__ = "journeys"
    id = Column(String, primary_key=True, default=_uuid)
    campaign_id = Column(String, index=True, nullable=False)
    name = Column(String, default="Journey")
    graph_json = Column(Text, default="{}")
    status = Column(String, default="DRAFT")
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
class ActivityEvent(Base):
    __tablename__ = "activity_events"
    id = Column(String, primary_key=True, default=_uuid)
    campaign_id = Column(String, index=True)
    type = Column(String, default="ai_action")
    payload_json = Column(Text, default="{}")
    request_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
class FieldValue(Base):
    __tablename__ = "field_values"
    id = Column(Integer, primary_key=True, autoincrement=True)
    campaign_id = Column(String, index=True)
    field_key = Column(String)
    value = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
