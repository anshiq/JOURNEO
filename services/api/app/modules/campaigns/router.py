from typing import Any

from fastapi import APIRouter, Query, Response

from app.core.deps import EditorGuard, SessionDep, SettingsDep
from app.modules.campaigns import service
from app.modules.campaigns.models import Campaign
from app.modules.campaigns.schemas import CreateBody, PatchBody, SaveTemplateBody
from app.modules.journeys import service as journeys
from app.modules.results import service as results

router = APIRouter(prefix="/api/v1", dependencies=[EditorGuard], tags=["campaigns"])


def summary(campaign: Campaign, extra: dict[str, Any] | None = None) -> dict[str, Any]:
    out = {
        "id": campaign.id,
        "name": campaign.name,
        "slug": campaign.slug,
        "brief": campaign.brief,
        "goal": campaign.goal,
        "audience": campaign.audience,
        "archived": campaign.archived,
        "createdAt": campaign.created_at.isoformat(),
        "updatedAt": campaign.updated_at.isoformat(),
    }
    out.update(extra or {})
    return out


def links(campaign: Campaign, base_url: str) -> dict[str, str]:
    return {"publicUrl": f"{base_url}/c/{campaign.slug}", "previewUrl": f"{base_url}/d/{campaign.dev_token}"}


@router.get("/campaigns")
async def list_campaigns(
    session: SessionDep,
    limit: int = Query(default=50, ge=1, le=100),
    cursor: str | None = Query(default=None, max_length=120),
) -> dict[str, Any]:
    rows, next_cursor = await service.list_page(session, limit, cursor)
    ids = [r.id for r in rows]
    status = await journeys.statuses(session, ids)
    counts = await results.counts(session, ids)
    items = [summary(r, {**status.get(r.id, {"status": "draft"}), **counts.get(r.id, {})}) for r in rows]
    return {"items": items, "nextCursor": next_cursor}


@router.post("/campaigns", status_code=201)
async def create_campaign(body: CreateBody, session: SessionDep, settings: SettingsDep) -> dict[str, Any]:
    campaign, journey_id, job_id = await service.create(session, body, settings)
    if body.website_url:
        from app.modules.assistant import service as assistant

        await assistant.add_url_source(session, campaign.id, body.website_url, title="Website")
    return {
        "campaign": summary(campaign, links(campaign, settings.public_base_url)),
        "journeyId": journey_id,
        "generationJobId": job_id,
    }


@router.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str, session: SessionDep, settings: SettingsDep) -> dict[str, Any]:
    campaign = await service.get(session, campaign_id)
    return summary(campaign, links(campaign, settings.public_base_url))


@router.patch("/campaigns/{campaign_id}")
async def patch_campaign(
    campaign_id: str, body: PatchBody, session: SessionDep, settings: SettingsDep
) -> dict[str, Any]:
    campaign = await service.update(session, campaign_id, body)
    return summary(campaign, links(campaign, settings.public_base_url))


@router.delete("/campaigns/{campaign_id}", status_code=204)
async def delete_campaign(campaign_id: str, session: SessionDep) -> Response:
    await service.soft_delete(session, campaign_id)
    return Response(status_code=204)


@router.post("/campaigns/{campaign_id}/duplicate", status_code=201)
async def duplicate_campaign(campaign_id: str, session: SessionDep, settings: SettingsDep) -> dict[str, Any]:
    campaign = await service.duplicate(session, campaign_id)
    return {"campaign": summary(campaign, links(campaign, settings.public_base_url))}


@router.post("/campaigns/{campaign_id}/save-as-template", status_code=201)
async def save_as_template(campaign_id: str, body: SaveTemplateBody, session: SessionDep) -> dict[str, Any]:
    campaign = await service.get(session, campaign_id)
    template_id = await journeys.save_as_template(session, campaign_id, body.name, campaign.goal)
    return {"templateId": template_id}


@router.post("/campaigns/{campaign_id}/preview-link/reset")
async def reset_preview_link(campaign_id: str, session: SessionDep, settings: SettingsDep) -> dict[str, Any]:
    token = await service.reset_dev_token(session, campaign_id)
    return {"previewUrl": f"{settings.public_base_url}/d/{token}"}


@router.get("/campaigns/{campaign_id}/slug-available")
async def slug_available(
    campaign_id: str, session: SessionDep, slug: str = Query(min_length=1, max_length=60)
) -> dict[str, Any]:
    await service.get(session, campaign_id)
    return await service.slug_available(session, campaign_id, slug)
