from typing import Any, Literal

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

from app.core.deps import EditorGuard, SessionDep, SettingsDep
from app.core.errors import NotFound
from app.core.ratelimit import path_param, rate_limit
from app.modules.ai import repo as jobs
from app.modules.ai import service
from app.modules.campaigns.schemas import Goal
from app.modules.journeys.domain.limits import L

generate_router = APIRouter(prefix="/api/v1/campaigns/{campaign_id}/journey", dependencies=[EditorGuard], tags=["ai"])

router = APIRouter(prefix="/api/v1/ai", dependencies=[EditorGuard], tags=["ai"])


class ApiModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")


class GenerateBody(ApiModel):
    brief: str | None = Field(default=None, max_length=L.brief)
    goal: Goal | None = None
    website_url: str | None = Field(default=None, alias="websiteUrl", max_length=L.url)
    audience: str | None = Field(default=None, max_length=L.audience)
    tone: str | None = Field(default=None, max_length=80)


class RewriteBody(ApiModel):
    text: str = Field(min_length=1, max_length=L.long_answer)
    instruction: str | None = Field(default=None, max_length=L.ai_prompt)
    voice: str | None = Field(default=None, max_length=L.brand_voice)
    kind: Literal["heading", "text", "button", "option", "label"] = "text"


class ScreenText(ApiModel):
    id: str = Field(min_length=1, max_length=64)
    text: str = Field(min_length=1, max_length=L.long_answer)
    limit: int = Field(default=500, ge=20, le=2000)


class RewriteScreenBody(ApiModel):
    texts: list[ScreenText] = Field(min_length=1, max_length=24)
    instruction: str | None = Field(default=None, max_length=L.ai_prompt)
    voice: str | None = Field(default=None, max_length=L.brand_voice)


class ThemeBody(ApiModel):
    prompt: str | None = Field(default=None, max_length=L.ai_prompt)
    website_url: str | None = Field(default=None, alias="websiteUrl", max_length=L.url)


class AltTextBody(ApiModel):
    url: str = Field(min_length=1, max_length=L.url)


campaign_quota = rate_limit("20/hour", "ai-generate", path_param("campaign_id"))
ai_quota = rate_limit("20/hour", "ai")


@generate_router.post("/generate", status_code=202)
async def start_generate(
    campaign_id: str, body: GenerateBody, session: SessionDep, settings: SettingsDep, _rl: None = campaign_quota
) -> dict[str, Any]:
    job = await service.start_generation(session, settings, campaign_id, body.model_dump(by_alias=True))
    return {"jobId": job.id}


@generate_router.get("/generate/{job_id}")
async def generate_status(campaign_id: str, job_id: str, session: SessionDep) -> dict[str, Any]:
    job = await jobs.get(session, campaign_id, job_id)
    if job is None:
        raise NotFound("Generation job not found")
    return service.status_view(job)


@generate_router.post("/generate/{job_id}/cancel")
async def cancel_generate(campaign_id: str, job_id: str, session: SessionDep) -> dict[str, Any]:
    job = await service.cancel_generation(session, campaign_id, job_id)
    return {"status": job.status, "cancelRequested": job.cancel_requested}


@router.post("/rewrite")
async def rewrite(body: RewriteBody, settings: SettingsDep, _rl: None = ai_quota) -> dict[str, Any]:
    suggestions = await service.rewrite_text(
        settings, text=body.text, instruction=body.instruction, voice=body.voice, kind=body.kind
    )
    return {"suggestions": suggestions}


@router.post("/rewrite-screen")
async def rewrite_screen(body: RewriteScreenBody, settings: SettingsDep, _rl: None = ai_quota) -> dict[str, Any]:
    texts = await service.rewrite_screen(
        settings,
        texts=[t.model_dump() for t in body.texts],
        instruction=body.instruction,
        voice=body.voice,
    )
    return {"texts": texts}


@router.post("/theme")
async def theme(body: ThemeBody, settings: SettingsDep, _rl: None = ai_quota) -> dict[str, Any]:
    return await service.restyle(settings, prompt=body.prompt, website_url=body.website_url)


@router.post("/alt-text")
async def alt_text(
    body: AltTextBody, session: SessionDep, settings: SettingsDep, _rl: None = ai_quota
) -> dict[str, Any]:
    return {"alt": await service.alt_text(session, settings, url=body.url)}
