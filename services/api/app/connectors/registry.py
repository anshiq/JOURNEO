from app.db.session import SessionLocal
from app.modules.connectors import service as S


async def dispatch(platform: str, action: str, payload: dict):
    payload = payload or {}
    db = SessionLocal()
    try:
        return await S.dispatch(db, platform, action, payload)
    finally:
        db.close()
