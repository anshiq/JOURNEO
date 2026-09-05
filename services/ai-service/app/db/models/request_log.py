from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.db.session import Base
class RequestLog(Base):
    __tablename__="request_logs"
    id=Column(Integer, primary_key=True, autoincrement=True)
    request_id=Column(String)
    method=Column(String)
    path=Column(String)
    status=Column(Integer)
    duration_ms=Column(Integer)
    facts_json=Column(Text)
    created_at=Column(DateTime, default=datetime.utcnow)
