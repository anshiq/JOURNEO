from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Date, BigInteger
from datetime import datetime, date
from app.db.session import Base
class ClickEvent(Base):
    __tablename__ = "click_events"
    id = Column(Integer, primary_key=True, autoincrement=True)
    campaign_id = Column(String, index=True)
    event_name = Column(String, default="unknown")
    session_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
class DeliveryEvent(Base):
    __tablename__ = "delivery_events"
    id = Column(Integer, primary_key=True, autoincrement=True)
    campaign_id = Column(String, index=True)
    platform = Column(String, default="meta")
    date = Column(Date, index=True)
    impressions = Column(BigInteger, default=0)
    clicks = Column(BigInteger, default=0)
    conversions = Column(BigInteger, default=0)
    spend = Column(Float, default=0)
    ctr = Column(Float, default=0)
    cpa = Column(Float, default=0)
    roas = Column(Float, default=0)
    frequency = Column(Float, default=0)
    viewability = Column(Float, default=0)
    reach = Column(Float, default=0)
class LlmUsageEvent(Base):
    __tablename__ = "llm_usage_events"
    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(String, nullable=True)
    campaign_id = Column(String, nullable=True, index=True)
    agent_type = Column(String, default="unknown")
    model = Column(String, default="unknown")
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    cost_usd = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
class MetricDefinition(Base):
    __tablename__ = "metric_definitions"
    key = Column(String, primary_key=True)
    label = Column(String)
    definition = Column(Text, default="")
    unit = Column(String, default="")
    formula = Column(String, nullable=True)
