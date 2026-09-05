from app.db.session import SessionLocal
from app.modules.connectors import service as S


async def whatsapp_broadcast(payload: dict):
    db = SessionLocal()
    try:
        return S.create_whatsapp(db, payload)
    finally:
        db.close()
