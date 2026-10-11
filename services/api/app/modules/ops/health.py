from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core import db

router = APIRouter(tags=["ops"])


@router.get("/health")
async def health() -> JSONResponse:
    return JSONResponse({"status": "ok"})


@router.get("/ready")
async def ready() -> JSONResponse:
    if db.engine is None:
        return JSONResponse({"status": "not_ready"}, status_code=503)
    try:
        async with db.engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse({"status": "not_ready"}, status_code=503)
    return JSONResponse({"status": "ok"})
