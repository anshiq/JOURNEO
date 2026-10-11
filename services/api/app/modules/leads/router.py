from typing import Any

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from app.core.deps import EditorGuard, SessionDep
from app.modules.campaigns import service as campaigns
from app.modules.leads import service

router = APIRouter(prefix="/api/v1", dependencies=[EditorGuard], tags=["leads"])


@router.get("/campaigns/{campaign_id}/leads")
async def list_leads(
    campaign_id: str,
    session: SessionDep,
    limit: int = Query(default=50, ge=1, le=200),
    cursor: str | None = Query(default=None, max_length=120),
    test: bool = False,
) -> dict[str, Any]:
    await campaigns.get(session, campaign_id)
    page = await service.list_page(session, campaign_id, limit, cursor, test)
    page["webhook"] = await service.webhook_status(session, campaign_id)
    return page


@router.get("/campaigns/{campaign_id}/leads.csv")
async def leads_csv(campaign_id: str, session: SessionDep, test: bool = False) -> StreamingResponse:
    campaign = await campaigns.get(session, campaign_id)
    rows = [row async for row in service.csv_rows(session, campaign_id, test)]
    filename = f"{campaign.slug}-leads.csv"
    return StreamingResponse(
        iter(rows),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/campaigns/{campaign_id}/leads/test-webhook")
async def test_webhook(campaign_id: str, session: SessionDep) -> dict[str, Any]:
    return await service.send_test(session, campaign_id)
