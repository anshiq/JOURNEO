from app.db.session import SessionLocal
from app.modules.connectors import service as S


async def google_create(payload: dict):
    db = SessionLocal()
    try:
        return S.create_google(db, payload)
    finally:
        db.close()
