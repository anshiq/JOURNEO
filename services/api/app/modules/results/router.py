from typing import Any, Literal

from fastapi import APIRouter, Query, Response

from app.core.deps import EditorGuard, SessionDep
from app.modules.campaigns import service as campaigns
from app.modules.results import service

router = APIRouter(prefix="/api/v1", dependencies=[EditorGuard], tags=["results"])


@router.get("/campaigns/{campaign_id}/results")
async def results(
    campaign_id: str,
    session: SessionDep,
    response: Response,
    range: Literal["7d", "30d", "all"] = Query(default="30d"),
) -> dict[str, Any]:
    await campaigns.get(session, campaign_id)
    response.headers["Cache-Control"] = "private, max-age=60"
    return await service.summary(session, campaign_id, range)
