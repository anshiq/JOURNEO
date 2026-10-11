import copy
import datetime
import secrets
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.errors import Conflict, NotFound, ValidationFailed
from app.modules.campaigns import repo
from app.modules.campaigns.models import Campaign
from app.modules.campaigns.schemas import CreateBody, PatchBody
from app.modules.campaigns.slugs import base_slug, candidates, is_valid
from app.modules.journeys import library
from app.modules.journeys import service as journeys
from app.modules.journeys.domain.ids import random_ids
from app.modules.journeys.domain.ops import instantiate_screen

GOAL_TEMPLATES = {
    "leads": "lead-gen-launch",
    "waitlist": "lead-gen-launch",
    "giveaway": "lead-gen-launch",
    "offer": "lead-gen-launch",
    "recommend": "product-quiz",
    "event": "event-registration",
    "feedback": "feedback-nps",
}
GOAL_NAMES = {
    "leads": "Lead campaign",
    "recommend": "Product finder",
    "giveaway": "Giveaway",
    "event": "Event sign-up",
    "feedback": "Feedback survey",
    "offer": "Special offer",
    "waitlist": "Waitlist",
}


def utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.UTC)


def auto_name(body: CreateBody) -> str:
    if body.name and body.name.strip():
        return body.name.strip()[:80]
    if body.brief and body.brief.strip():
        words = body.brief.strip().split()
        name = " ".join(words[:6])
        return (name[0].upper() + name[1:])[:80] if name else "Untitled campaign"
    if body.goal:
        return GOAL_NAMES[body.goal]
    return "Untitled campaign"


async def unique_slug(session: AsyncSession, value: str, campaign_id: str | None = None) -> str:
    for candidate in candidates(base_slug(value)):
        owner = await repo.slug_owner(session, candidate)
        if owner is None or owner == campaign_id:
            return candidate
    raise Conflict("No free link name")


def blank_doc() -> dict[str, Any]:
    ids = random_ids
    keys: set[str] = set()
    welcome = library.recipe("welcome") or {"name": "Welcome", "elements": []}
    thanks = library.recipe("thank-you") or {"name": "Thank you", "elements": []}
    first = instantiate_screen(welcome, ids, keys)
    last = instantiate_screen(thanks, ids, keys)
    start = ids("stp")
    return {
        "schemaVersion": 4,
        "theme": {},
        "screens": {first["id"]: first, last["id"]: last},
        "steps": [
            {"id": start, "kind": "start"},
            {"id": first["id"], "kind": "screen"},
            {"id": last["id"], "kind": "screen"},
        ],
        "links": {start: {"next": first["id"]}, first["id"]: {"next": last["id"]}},
        "settings": {"progress": "bar", "allowBack": False},
    }


def apply_brand(doc: dict[str, Any], body: CreateBody) -> dict[str, Any]:
    out = copy.deepcopy(doc)
    brand = body.brand
    theme = out.setdefault("theme", {})
    if brand and brand.color:
        theme.setdefault("colors", {})["primary"] = brand.color
    logo = None
    if brand and brand.logo_file_key:
        logo = f"/api/v1/files/{brand.logo_file_key}"
    elif brand and brand.logo_url:
        logo = brand.logo_url
    if logo:
        theme["logo"] = {"src": logo, "position": "left", "size": "md"}
    if body.tone:
        theme["voice"] = body.tone[:500]
    return out


async def starting_doc(session: AsyncSession, body: CreateBody) -> dict[str, Any]:
    mode = body.start.mode
    template_id = body.start.template_id
    if mode == "ai" and not template_id:
        template_id = GOAL_TEMPLATES.get(body.goal or "leads", "lead-gen-launch")
        mode = "template"
    if mode == "template":
        found = library.template(template_id or "") if template_id else None
        if found is None and template_id:
            found = await journeys.user_template(session, template_id)
        if found is None:
            found = library.template(GOAL_TEMPLATES.get(body.goal or "leads", "lead-gen-launch"))
        if found is None:
            raise NotFound("Template not found")
        return copy.deepcopy(found["doc"])
    return blank_doc()


async def create(
    session: AsyncSession, body: CreateBody, settings: Settings | None = None
) -> tuple[Campaign, str, str | None]:
    name = auto_name(body)
    campaign = await repo.insert(
        session,
        {
            "name": name,
            "slug": await unique_slug(session, name),
            "brief": (body.brief or "")[:2000],
            "goal": body.goal,
            "audience": (body.audience or "")[:300],
        },
    )
    if body.start.mode == "ai" and not body.start.template_id:
        from app.modules.ai import service as ai

        brief = ai.brief_of(
            {
                "brief": body.brief,
                "goal": body.goal,
                "websiteUrl": body.website_url,
                "audience": body.audience,
                "tone": body.tone,
            }
        )
        doc = apply_brand(ai.deterministic_doc(brief), body)
        journey = await journeys.create_for_campaign(session, campaign.id, doc)
        if settings is not None and settings.llm.configured:
            job = await ai.start_generation(session, settings, campaign.id, brief)
            return campaign, journey.id, job.id
        return campaign, journey.id, None
    doc = apply_brand(await starting_doc(session, body), body)
    journey = await journeys.create_for_campaign(session, campaign.id, doc)
    return campaign, journey.id, None


async def get(session: AsyncSession, campaign_id: str) -> Campaign:
    campaign = await repo.get(session, campaign_id)
    if campaign is None:
        raise NotFound("Campaign not found")
    return campaign


async def list_page(session: AsyncSession, limit: int, cursor: str | None) -> tuple[list[Campaign], str | None]:
    parsed: tuple[datetime.datetime, str] | None = None
    if cursor:
        stamp, _, last_id = cursor.partition("|")
        try:
            parsed = (datetime.datetime.fromisoformat(stamp), last_id)
        except ValueError as exc:
            raise ValidationFailed("Invalid cursor") from exc
    rows = await repo.list_active(session, limit + 1, parsed)
    next_cursor = None
    if len(rows) > limit:
        rows = rows[:limit]
        last = rows[-1]
        next_cursor = f"{last.updated_at.isoformat()}|{last.id}"
    return rows, next_cursor


async def update(session: AsyncSession, campaign_id: str, body: PatchBody) -> Campaign:
    campaign = await get(session, campaign_id)
    if body.name is not None:
        campaign.name = body.name.strip()[:80] or campaign.name
    if body.brief is not None:
        campaign.brief = body.brief
    if body.goal is not None:
        campaign.goal = body.goal
    if body.audience is not None:
        campaign.audience = body.audience
    if body.archived is not None:
        campaign.archived = body.archived
    if body.slug is not None and body.slug != campaign.slug:
        slug = body.slug.strip().lower()
        if not is_valid(slug):
            raise ValidationFailed("Use lowercase letters, numbers and dashes", field="slug")
        owner = await repo.slug_owner(session, slug)
        if owner is not None and owner != campaign.id:
            raise Conflict("This link name is taken", field="slug", suggestion=await unique_slug(session, slug))
        await repo.forget_slug(session, slug)
        await repo.remember_slug(session, campaign.slug, campaign.id)
        campaign.slug = slug
        journeys.after_commit(session, campaign.id)
    campaign.updated_at = utcnow()
    await session.flush()
    return campaign


async def slug_available(session: AsyncSession, campaign_id: str, slug: str) -> dict[str, Any]:
    candidate = slug.strip().lower()
    valid = is_valid(candidate)
    owner = await repo.slug_owner(session, candidate) if valid else None
    available = valid and (owner is None or owner == campaign_id)
    suggestion = candidate if available else await unique_slug(session, candidate or "campaign", campaign_id)
    return {"available": available, "valid": valid, "suggestion": suggestion}


async def soft_delete(session: AsyncSession, campaign_id: str) -> None:
    campaign = await get(session, campaign_id)
    campaign.deleted_at = utcnow()
    await session.flush()
    journeys.after_commit(session, campaign_id)


async def duplicate(session: AsyncSession, campaign_id: str) -> Campaign:
    source = await get(session, campaign_id)
    doc, _, _ = await journeys.get_draft(session, campaign_id)
    name = f"Copy of {source.name}"[:80]
    campaign = await repo.insert(
        session,
        {
            "name": name,
            "slug": await unique_slug(session, name),
            "brief": source.brief,
            "goal": source.goal,
            "audience": source.audience,
        },
    )
    await journeys.create_for_campaign(session, campaign.id, doc)
    return campaign


async def reset_dev_token(session: AsyncSession, campaign_id: str) -> str:
    campaign = await get(session, campaign_id)
    campaign.dev_token = secrets.token_urlsafe(24)
    await session.flush()
    return campaign.dev_token


async def resolve_public(session: AsyncSession, slug_or_id: str) -> tuple[Campaign | None, bool]:
    campaign, from_history = await repo.by_slug_or_id(session, slug_or_id)
    return campaign, from_history


async def by_dev_token(session: AsyncSession, token: str) -> Campaign | None:
    return await repo.by_dev_token(session, token)


async def exists(session: AsyncSession, campaign_id: str) -> bool:
    return await repo.get(session, campaign_id) is not None
