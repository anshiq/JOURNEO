import asyncio
import copy
import io
import pathlib
import re
from dataclasses import dataclass, field
from typing import Any, Protocol, get_args

import anyio
import orjson
from jinja2 import Environment, FileSystemLoader, StrictUndefined, select_autoescape
from PIL import Image
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import db
from app.core.config import Settings, get_settings
from app.core.errors import NotFound, ServiceUnavailable, ValidationFailed
from app.core.http import fetch_bytes, fetch_text
from app.core.llm import LlmClient, LlmOutputError, make_llm
from app.core.logging import log_event
from app.modules.ai import fallback
from app.modules.ai import repo as jobs
from app.modules.ai.models import AiGenerationJob
from app.modules.ai.spec import AuthoringSpec, ElementSpec, ElementType, ScreenSpec
from app.modules.campaigns import service as campaigns
from app.modules.journeys import library
from app.modules.journeys import service as journeys
from app.modules.journeys.domain import compose as composer
from app.modules.journeys.domain import validate as rules
from app.modules.journeys.domain.ids import sequential_ids
from app.modules.journeys.domain.rules.content import is_web_url
from app.modules.journeys.domain.rules.model import Issue, Target

_env = Environment(
    loader=FileSystemLoader(pathlib.Path(__file__).parent / "prompts"),
    undefined=StrictUndefined,
    autoescape=select_autoescape(default=False),
    keep_trailing_newline=True,
)

OUTLINE_TOKENS = 1200
OUTLINE_TIMEOUT = 15.0
CONTENT_TOKENS = 3000
CONTENT_TIMEOUT = 25.0
CHUNK_SCREENS = 3
CHUNK_CONCURRENCY = 3
REPAIR_ROUNDS = 2
MAX_ELEMENTS = 12

KNOWN_TYPES = set(get_args(ElementType))

COLOR_KEYS = ("primary", "accent", "background", "surface", "text")
PAIRINGS = ("classic", "editorial", "modern", "friendly", "elegant", "bold", "tech", "rounded")
RADII = ("none", "sm", "md", "lg", "full")
BUTTON_STYLES = ("solid", "outline", "soft")
HEX = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
META_COLOR = re.compile(r'<meta[^>]+name=["\']theme-color["\'][^>]+content=["\']([^"\']+)["\']', re.IGNORECASE)
META_OG = re.compile(
    r'<meta[^>]+property=["\']og:(image|site_name|title)["\'][^>]+content=["\']([^"\']+)["\']', re.IGNORECASE
)
META_NAME_OG = re.compile(
    r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:(image|site_name|title)["\']', re.IGNORECASE
)
TITLE_TAG = re.compile(r"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)
TAG = re.compile(r"<[^>]+>")


class Cancelled(Exception):
    pass


class JobMissing(Exception):
    pass


class Hooks(Protocol):
    async def cancelled(self) -> bool: ...

    async def update(self, **values: Any) -> None: ...

    async def check(self, doc: dict[str, Any]) -> list[Issue]: ...


@dataclass
class Built:
    doc: dict[str, Any]
    spec: AuthoringSpec | None
    fallback: list[str] = field(default_factory=list)
    issues: list[Issue] = field(default_factory=list)


STRUCTURE = Issue("J_MODEL", "error", "The draft has structural problems", Target("step", "doc"))


class DetachedHooks:
    async def cancelled(self) -> bool:
        return False

    async def update(self, **values: Any) -> None:
        return None

    async def check(self, doc: dict[str, Any]) -> list[Issue]:
        try:
            _, parsed, upgrade = journeys.parse(doc)
        except ValidationFailed:
            return [STRUCTURE]
        return rules.validate(parsed) + upgrade


class JobHooks:
    def __init__(self, job_id: str, campaign_id: str) -> None:
        self.job_id = job_id
        self.campaign_id = campaign_id

    async def cancelled(self) -> bool:
        return await cancel_requested(self.job_id)

    async def update(self, **values: Any) -> None:
        await set_job(self.job_id, **values)

    async def check(self, doc: dict[str, Any]) -> list[Issue]:
        async with db.session_scope() as session:
            try:
                return await journeys.check(session, self.campaign_id, doc)
            except ValidationFailed:
                return [STRUCTURE]


def brief_of(body: dict[str, Any]) -> dict[str, Any]:
    return {
        "brief": (body.get("brief") or "")[:2000],
        "goal": body.get("goal") or "leads",
        "websiteUrl": (body.get("websiteUrl") or "")[:2048],
        "audience": (body.get("audience") or "")[:300],
        "tone": (body.get("tone") or "")[:500],
    }


def status_view(job: AiGenerationJob) -> dict[str, Any]:
    return {
        "jobId": job.id,
        "status": job.status,
        "stage": job.stage,
        "outline": job.outline,
        "screensDone": job.screens_done,
        "fallbackScreens": job.fallback_screens,
        "issues": job.issues,
        "error": job.error,
        "brief": job.brief,
    }


def llm_or_503(settings: Settings) -> LlmClient:
    try:
        return make_llm(settings.llm)
    except Exception as exc:
        raise ServiceUnavailable("AI is not configured") from exc


def deterministic_doc(brief: dict[str, Any]) -> dict[str, Any]:
    doc = fallback.goal_doc(brief.get("goal"), brief.get("brief"))
    if brief.get("tone"):
        theme = copy.deepcopy(doc.get("theme") or {})
        theme["voice"] = brief["tone"]
        doc["theme"] = theme
    return doc


async def set_job(job_id: str, **values: Any) -> None:
    async with db.session_scope() as session:
        job = await jobs.by_id(session, job_id)
        if job is not None:
            await jobs.update(session, job, **values)


async def cancel_requested(job_id: str) -> bool:
    async with db.session_scope() as session:
        job = await jobs.by_id(session, job_id)
        return job is None or job.cancel_requested


async def job_exists(job_id: str) -> bool:
    async with db.session_scope() as session:
        return await jobs.by_id(session, job_id) is not None


async def start_generation(
    session: AsyncSession, settings: Settings, campaign_id: str, body: dict[str, Any]
) -> AiGenerationJob:
    await campaigns.get(session, campaign_id)
    active = await jobs.active_for(session, campaign_id)
    if active is not None:
        return active
    brief = brief_of(body)
    job = await jobs.insert(session, campaign_id, brief)
    if not settings.llm.configured:
        doc = deterministic_doc(brief)
        await journeys.replace_draft(session, campaign_id, doc, "ai_generate")
        await jobs.update(
            session,
            job,
            status="done",
            stage="done",
            screens_done=len(doc.get("screens", {})),
            fallback_screens=screen_names(doc),
            issues=[],
        )
        log_event("generation fallback", event="ai_generate", campaign_id=campaign_id, job_id=job.id)
        return job
    from app.modules.ai.tasks import generate_journey

    await generate_journey.configure(queueing_lock=f"gen:{campaign_id}").defer_async(job_id=job.id)
    return job


async def cancel_generation(session: AsyncSession, campaign_id: str, job_id: str) -> AiGenerationJob:
    job = await jobs.get(session, campaign_id, job_id)
    if job is None:
        raise NotFound("Generation job not found")
    if job.status in ("queued", "running"):
        await jobs.update(session, job, cancel_requested=True)
    return job


def vars_for(brief: dict[str, Any]) -> dict[str, Any]:
    return {
        "goal": brief.get("goal") or "leads",
        "brief": brief.get("brief") or "",
        "audience": brief.get("audience") or "",
        "tone": brief.get("tone") or "",
        "voice": brief.get("tone") or "",
    }


async def outline_spec(llm: LlmClient, model: str, brief: dict[str, Any]) -> AuthoringSpec:
    body = _env.get_template("outline.v1.j2").render(**vars_for(brief))
    messages: list[dict[str, Any]] = [{"role": "user", "content": body}]
    attempts = 0
    while True:
        attempts += 1
        try:
            data = await llm.complete_json(
                task="ai.outline", model=model, messages=messages, max_tokens=OUTLINE_TOKENS, timeout=OUTLINE_TIMEOUT
            )
            return AuthoringSpec.model_validate(data)
        except (LlmOutputError, ValidationError):
            if attempts > 1:
                raise
            messages = [*messages, {"role": "user", "content": "Return ONLY the JSON object, no other text."}]


def clean_elements(raw: Any) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    if not isinstance(raw, list):
        return out
    for entry in raw:
        if not isinstance(entry, dict) or entry.get("type") not in KNOWN_TYPES:
            continue
        props = entry.get("props") if isinstance(entry.get("props"), dict) else {}
        out.append({"type": entry["type"], "props": props})
        if len(out) >= MAX_ELEMENTS:
            break
    return out


def outline_json(spec: AuthoringSpec) -> str:
    return orjson.dumps(spec.compose_input()).decode()


async def fill_chunk(
    llm: LlmClient,
    model: str,
    brief: dict[str, Any],
    spec: AuthoringSpec,
    chunk: list[ScreenSpec],
    note: str = "",
) -> list[str]:
    brief_text = (brief.get("brief") or "") + (f"\n{note}" if note else "")
    body = _env.get_template("content.v1.j2").render(
        **{**vars_for(brief), "brief": brief_text, "outline": outline_json(spec), "screens": chunk}
    )
    try:
        data = await llm.complete_json(
            task="ai.content",
            model=model,
            messages=[{"role": "user", "content": body}],
            max_tokens=CONTENT_TOKENS,
            timeout=CONTENT_TIMEOUT,
        )
    except Exception as exc:
        log_event("chunk fallback", event="ai_generate", err=type(exc).__name__)
        return [s.title for s in chunk]
    found: dict[str, list[dict[str, Any]]] = {}
    screens = data.get("screens")
    for entry in screens if isinstance(screens, list) else []:
        if isinstance(entry, dict) and isinstance(entry.get("title"), str):
            found[entry["title"].strip().lower()] = clean_elements(entry.get("elements"))
    failed: list[str] = []
    for screen in chunk:
        elements = found.get(screen.title.strip().lower())
        try:
            parsed = [ElementSpec.model_validate(e) for e in elements] if elements else []
        except ValidationError:
            parsed = []
        if parsed:
            screen.elements = parsed
        else:
            failed.append(screen.title)
    return failed


def merge_theme(base: dict[str, Any], spec: AuthoringSpec) -> dict[str, Any]:
    theme = copy.deepcopy(base)
    hint = spec.theme()
    if hint.get("preset"):
        theme["preset"] = hint["preset"]
    if hint.get("colors"):
        colors = copy.deepcopy(theme.get("colors") or {})
        colors.update(hint["colors"])
        theme["colors"] = colors
    if (hint.get("fonts") or {}).get("pairing"):
        fonts = copy.deepcopy(theme.get("fonts") or {})
        fonts["pairing"] = hint["fonts"]["pairing"]
        theme["fonts"] = fonts
    if hint.get("voice"):
        theme["voice"] = hint["voice"]
    return theme


def screen_names(doc: dict[str, Any]) -> list[str]:
    return sorted({str(s.get("name") or sid) for sid, s in (doc.get("screens") or {}).items()})


def implicated_titles(doc: dict[str, Any], issues: list[Issue]) -> list[str]:
    names = {sid: str(s.get("name") or sid) for sid, s in (doc.get("screens") or {}).items()}
    titles: list[str] = []
    for issue in issues:
        sid = issue.target.screen_id or (issue.target.id if issue.target.kind == "screen" else None)
        if sid and sid in names and names[sid] not in titles:
            titles.append(names[sid])
    return titles


def assemble(spec: AuthoringSpec, theme_base: dict[str, Any]) -> dict[str, Any]:
    payload = spec.compose_input()
    payload["theme"] = merge_theme(theme_base, spec)
    return composer.compose(payload, sequential_ids(), library.recipes_by_id())


async def deterministic(brief: dict[str, Any], hooks: Hooks) -> Built:
    doc = deterministic_doc(brief)
    issues = rules.blocking(await hooks.check(doc))
    return Built(doc, None, screen_names(doc), issues)


async def build_draft(
    llm: LlmClient, model: str, brief: dict[str, Any], theme_base: dict[str, Any], hooks: Hooks
) -> Built:
    if await hooks.cancelled():
        raise Cancelled(brief.get("goal", ""))
    try:
        spec = await outline_spec(llm, model, brief)
    except Exception as exc:
        log_event("outline fallback", event="ai_generate", err=type(exc).__name__)
        return await deterministic(brief, hooks)
    await hooks.update(outline=spec.compose_input(), stage="content")
    missing: set[str] = set()
    sem = asyncio.Semaphore(CHUNK_CONCURRENCY)

    async def run_chunk(chunk: list[ScreenSpec], note: str = "") -> None:
        async with sem:
            if await hooks.cancelled():
                raise Cancelled(brief.get("goal", ""))
            failed = set(await fill_chunk(llm, model, brief, spec, chunk, note))
            for screen in chunk:
                if screen.title in failed:
                    missing.add(screen.title)
                else:
                    missing.discard(screen.title)

    screens = list(spec.screens)
    await asyncio.gather(*(run_chunk(screens[i : i + CHUNK_SCREENS]) for i in range(0, len(screens), CHUNK_SCREENS)))
    doc = assemble(spec, theme_base)
    for _ in range(REPAIR_ROUNDS):
        found = rules.blocking(await hooks.check(doc))
        if not found:
            break
        titles = implicated_titles(doc, found)
        subset = [s for s in spec.screens if s.title in titles]
        if not subset:
            break
        note = "Fix these problems: " + "; ".join(f"{i.code} {i.message}" for i in found[:8])
        await run_chunk(subset, note)
        doc = assemble(spec, theme_base)
    issues = rules.blocking(await hooks.check(doc))
    if issues:
        titles = implicated_titles(doc, issues)
        for screen in spec.screens:
            if screen.title in titles:
                screen.elements = []
                missing.add(screen.title)
        doc = assemble(spec, theme_base)
        issues = rules.blocking(await hooks.check(doc))
    if issues:
        log_event("generation used template", event="ai_generate", issues=len(issues))
        return await deterministic(brief, hooks)
    return Built(doc, spec, sorted(missing), [])


async def run_generation(job_id: str, settings: Settings | None = None) -> None:
    settings = settings or get_settings()
    async with db.session_scope() as session:
        job = await jobs.by_id(session, job_id)
        if job is None:
            raise JobMissing(job_id)
        campaign_id = job.campaign_id
        brief = dict(job.brief or {})
        if job.cancel_requested:
            await jobs.update(session, job, status="cancelled", stage="done")
            return
        await jobs.update(session, job, status="running", stage="outline")
        draft, _, _ = await journeys.get_draft(session, campaign_id)
    hooks = JobHooks(job_id, campaign_id)
    try:
        llm = make_llm(settings.llm)
        built = await build_draft(llm, settings.llm.generation, brief, draft.get("theme") or {}, hooks)
        if await hooks.cancelled():
            raise Cancelled(job_id)
        async with db.session_scope() as session:
            await journeys.replace_draft(session, campaign_id, built.doc, "ai_generate")
            job = await jobs.by_id(session, job_id)
            if job is not None:
                await jobs.update(
                    session,
                    job,
                    status="done",
                    stage="done",
                    spec=built.spec.compose_input() if built.spec else None,
                    screens_done=len(built.doc.get("screens", {})),
                    fallback_screens=built.fallback,
                    issues=[i.as_dict() for i in built.issues],
                    error=None,
                )
        log_event(
            "generation done",
            event="ai_generate",
            campaign_id=campaign_id,
            job_id=job_id,
            screens=len(built.doc.get("screens", {})),
            fallback=len(built.fallback),
        )
    except Cancelled:
        await set_job(job_id, status="cancelled", stage="done")
    except Exception as exc:
        await set_job(job_id, status="error", stage="done", error=f"{type(exc).__name__}: {exc}"[:300])
        log_event(
            "generation failed", event="ai_generate", campaign_id=campaign_id, job_id=job_id, err=type(exc).__name__
        )


def rewrite_limit(text: str) -> int:
    return min(max(len(text) * 2, 160), 1000)


async def rewrite_text(
    settings: Settings, *, text: str, instruction: str | None, voice: str | None, kind: str = "text"
) -> list[str]:
    llm = llm_or_503(settings)
    limit = rewrite_limit(text)
    body = _env.get_template("rewrite.v1.j2").render(
        text=text,
        instruction=instruction or "Make it shorter and more persuasive.",
        voice=voice or "",
        limit=limit,
        kind=kind,
    )
    try:
        data = await llm.complete_json(
            task="ai.rewrite",
            model=settings.llm.generation,
            messages=[{"role": "user", "content": body}],
            max_tokens=600,
            timeout=25.0,
        )
    except LlmOutputError as exc:
        raise ServiceUnavailable("AI did not return usable copy") from exc
    raw = data.get("suggestions")
    suggestions = [str(s).strip()[:limit] for s in raw] if isinstance(raw, list) else []
    suggestions = [s for s in suggestions if s]
    if not suggestions:
        raise ServiceUnavailable("AI did not return usable copy")
    return suggestions[:3]


async def rewrite_screen(
    settings: Settings, *, texts: list[dict[str, Any]], instruction: str | None, voice: str | None
) -> dict[str, str]:
    llm = llm_or_503(settings)
    body = _env.get_template("rewrite_screen.v1.j2").render(
        texts=texts,
        instruction=instruction or "Make it more persuasive.",
        voice=voice or "",
    )
    try:
        data = await llm.complete_json(
            task="ai.rewrite_screen",
            model=settings.llm.generation,
            messages=[{"role": "user", "content": body}],
            max_tokens=1500,
            timeout=25.0,
        )
    except LlmOutputError as exc:
        raise ServiceUnavailable("AI did not return usable copy") from exc
    raw = data.get("texts")
    if not isinstance(raw, dict):
        raise ServiceUnavailable("AI did not return usable copy")
    limits = {t["id"]: int(t.get("limit") or 500) for t in texts if isinstance(t.get("id"), str)}
    out = {k: str(v).strip()[: limits.get(k, 500)] for k, v in raw.items() if k in limits and str(v).strip()}
    if not out:
        raise ServiceUnavailable("AI did not return usable copy")
    return out


def brand_signals_from(html: str) -> dict[str, Any]:
    signals: dict[str, Any] = {}
    color = META_COLOR.search(html)
    if color and HEX.match(color.group(1)):
        signals["color"] = color.group(1)
    for match in list(META_OG.finditer(html)) + list(META_NAME_OG.finditer(html)):
        groups = match.groups()
        first_is_key = groups[0] in ("image", "site_name", "title")
        key = groups[0] if first_is_key else groups[1]
        value = groups[1] if first_is_key else groups[0]
        if key in ("image", "site_name", "title") and value and key not in signals:
            signals[key] = value[:500]
    title = TITLE_TAG.search(html)
    if title and "title" not in signals:
        signals["title"] = TAG.sub("", title.group(1)).strip()[:120]
    return signals


async def brand_signals(url: str | None) -> dict[str, Any]:
    if not url or not is_web_url(url):
        return {}
    try:
        html, _ = await fetch_text(url)
    except Exception:
        return {}
    return brand_signals_from(html[:200000])


def clean_theme(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        return {}
    theme: dict[str, Any] = {}
    colors = raw.get("colors")
    if isinstance(colors, dict):
        kept = {k: v for k, v in colors.items() if k in COLOR_KEYS and isinstance(v, str) and HEX.match(v)}
        if kept:
            theme["colors"] = kept
    if raw.get("pairing") in PAIRINGS:
        theme["fonts"] = {"pairing": raw["pairing"]}
    if raw.get("radius") in RADII:
        theme["radius"] = raw["radius"]
    if raw.get("buttons") in BUTTON_STYLES:
        theme["buttons"] = {"style": raw["buttons"]}
    return theme


async def restyle(settings: Settings, *, prompt: str | None, website_url: str | None) -> dict[str, Any]:
    if not prompt and not website_url:
        raise ValidationFailed("Give a prompt or a website address")
    if website_url and not is_web_url(website_url):
        raise ValidationFailed("Enter a valid web address", field="websiteUrl")
    llm = llm_or_503(settings)
    signals = await brand_signals(website_url)
    body = _env.get_template("theme.v1.j2").render(
        prompt=prompt or "",
        signals=orjson.dumps(signals).decode() if signals else "none",
    )
    try:
        data = await llm.complete_json(
            task="ai.theme",
            model=settings.llm.generation,
            messages=[{"role": "user", "content": body}],
            max_tokens=600,
            timeout=25.0,
        )
    except LlmOutputError as exc:
        raise ServiceUnavailable("AI did not return a usable theme") from exc
    theme = clean_theme(data)
    if not theme:
        raise ServiceUnavailable("AI did not return a usable theme")
    return {"theme": theme, "signals": signals}


def shrink_image(data: bytes) -> tuple[bytes, str]:
    with Image.open(io.BytesIO(data)) as raw:
        image = raw.convert("RGB")
        image.thumbnail((768, 768), Image.Resampling.LANCZOS)
        buffer = io.BytesIO()
        image.save(buffer, "JPEG", quality=70)
        return buffer.getvalue(), "image/jpeg"


async def image_bytes(session: AsyncSession, settings: Settings, url: str) -> tuple[bytes, str] | None:
    if url.startswith("/api/v1/files/"):
        if settings.storage.resolved_driver == "db":
            from app.modules.media.storage.db import DbStorage

            stored = await DbStorage(session).get(url.rsplit("/", 1)[-1])
            if stored is not None:
                return stored.data, stored.mime
        try:
            base = str(settings.public_base_url).rstrip("/")
            data, _, mime = await fetch_bytes(base + url)
            return data, mime
        except Exception:
            return None
    if not is_web_url(url):
        return None
    try:
        data, _, mime = await fetch_bytes(url, max_bytes=5_000_000)
        return data, mime
    except Exception:
        return None


async def alt_text(session: AsyncSession, settings: Settings, *, url: str) -> str:
    try:
        llm = make_llm(settings.llm)
    except Exception:
        return ""
    found = await image_bytes(session, settings, url)
    if found is None:
        return ""
    try:
        small = await anyio.to_thread.run_sync(shrink_image, found[0])
        text = await llm.describe_image(
            task="ai.alt",
            model=settings.llm.vision_model or settings.llm.generation,
            image=small[0],
            mime=small[1],
            prompt="Describe this image in one short sentence for alt text. Max 200 characters.",
            max_tokens=80,
            timeout=25.0,
        )
    except Exception:
        return ""
    return " ".join(text.split())[:250]
