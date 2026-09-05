from app.db.session import SessionLocal
from app.modules.connectors import service as S


async def meta_create(payload: dict):
    db = SessionLocal()
    try:
        return S.create_meta(db, payload)
    finally:
        db.close()
async def meta_pause(campaign_id: str):
    db = SessionLocal()
    try:
        return S.pause_meta(db, campaign_id, {})
    finally:
        db.close()
