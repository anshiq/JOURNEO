from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from datetime import datetime
from app.db.session import Base, SessionLocal


class RunSession(Base):
    __tablename__ = "run_sessions"
    id = Column(String, primary_key=True)
    journey_id = Column(String, index=True)
    campaign_id = Column(String, index=True)
    mode = Column(String)
    graph_version = Column(Integer)
    status = Column(String)
    request_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)



class RunScreenExecution(Base):
    __tablename__ = "run_screen_executions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, index=True)
    screen_id = Column(String)
    block_ids = Column(Text, nullable=True)
    handle = Column(String, nullable=True)
    status = Column(String)
    profile_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class RunActivityEvent(Base):
    __tablename__ = "run_activity_events"
    id = Column(Integer, primary_key=True, autoincrement=True)
    campaign_id = Column(String, index=True)
    session_id = Column(String, nullable=True)
    type = Column(String)
    payload_json = Column(JSON, nullable=True)
    request_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


def save_session(sess, request_id=None):
    db = SessionLocal()
    try:
        db.add(RunSession(id=sess["id"], journey_id=sess["journey_id"], campaign_id=sess["campaign_id"], mode=sess["mode"], graph_version=sess["graph_version"], status="running", request_id=request_id))
        db.commit()
    finally:
        db.close()


def save_execution(session_id, screen_id, block_ids, handle, profile):
    db = SessionLocal()
    try:
        import json
        bids = block_ids if isinstance(block_ids, str) else json.dumps(block_ids or [])
        db.add(RunScreenExecution(session_id=session_id, screen_id=screen_id, block_ids=bids, handle=handle, status="served", profile_json=dict(profile or {})))

        db.commit()
    finally:
        db.close()


def save_activity(campaign_id, session_id, kind, payload, request_id=None):
    db = SessionLocal()
    try:
        db.add(RunActivityEvent(campaign_id=campaign_id, session_id=session_id, type=kind, payload_json=payload, request_id=request_id))
        db.commit()
    finally:
        db.close()


def finish_session(session_id, status="completed"):
    db = SessionLocal()
    try:
        row = db.query(RunSession).filter(RunSession.id == session_id).first()
        if row is not None:
            row.status = status
            row.completed_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()


def get_session_with_executions(session_id):
    db = SessionLocal()
    try:
        row = db.query(RunSession).filter(RunSession.id == session_id).first()
        if row is None:
            return None
        execs = db.query(RunScreenExecution).filter(RunScreenExecution.session_id == session_id).order_by(RunScreenExecution.id.asc()).all()
        return {
            "id": row.id,
            "journeyId": row.journey_id,
            "campaignId": row.campaign_id,
            "mode": row.mode,
            "graphVersion": row.graph_version,
            "status": row.status,
            "createdAt": row.created_at.isoformat() if row.created_at else None,
            "completedAt": row.completed_at.isoformat() if row.completed_at else None,
            "executions": [{"screenId": e.screen_id, "blockIds": e.block_ids, "handle": e.handle, "status": e.status, "createdAt": e.created_at.isoformat() if e.created_at else None} for e in execs],
        }
    finally:
        db.close()
