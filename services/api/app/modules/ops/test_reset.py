from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.deps import SessionDep
from app.modules.runtime import doc_cache

router = APIRouter(prefix="/api/v1/test", tags=["test"])
TABLES = (
    "webhook_deliveries",
    "leads",
    "journey_events",
    "journey_sessions",
    "document_chunks",
    "knowledge_sources",
    "ai_generation_jobs",
    "journey_draft_checkpoints",
    "journey_versions",
    "journeys",
    "campaign_slugs",
    "campaigns",
    "user_templates",
    "files",
)


@router.post("/reset")
async def reset(session: SessionDep) -> JSONResponse:
    await session.execute(text("UPDATE journeys SET live_version_id = NULL"))
    await session.execute(text(f"TRUNCATE {', '.join(TABLES)} CASCADE"))
    doc_cache.clear()
    return JSONResponse({"ok": True})
