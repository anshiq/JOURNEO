from typing import Any

import orjson
from fastapi import APIRouter, Path, Request, Response
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from limits import parse

from app.core.deps import SessionDep, SettingsDep
from app.core.errors import NotFound, PayloadTooLarge
from app.core.ratelimit import enforce, path_param, rate_limit
from app.modules.journeys.domain.limits import L
from app.modules.runtime import service
from app.modules.runtime.fonts import preload_fonts
from app.modules.runtime.page import CSP, meta_for, page_etag, page_templates, render_page
from app.modules.runtime.schemas import AssistBody, SessionBody, SubmitBody

router = APIRouter(prefix="/api/v1/public", tags=["public"])
SlugParam = Path(min_length=1, max_length=64)
DAILY_ASSIST = parse("200/day")


def not_modified(request: Request, etag: str) -> bool:
    return request.headers.get("if-none-match") == etag


@router.get("/page/{slug}", response_class=HTMLResponse, response_model=None)
async def public_page(
    request: Request,
    session: SessionDep,
    settings: SettingsDep,
    slug: str = SlugParam,
    _rl: None = rate_limit("120/minute", "page"),
) -> Response:
    try:
        view = await service.resolve(session, slug)
    except NotFound:
        template = await page_templates.get(settings)
        meta = meta_for(
            None, "Not found", f"{settings.public_base_url}/c/{slug}", settings.public_base_url, noindex=True
        )
        payload = orjson.dumps({"mode": "live", "notFound": True, "doc": None})
        return HTMLResponse(
            render_page(template, meta, payload, []), status_code=404, headers={"Content-Security-Policy": CSP}
        )
    if view.redirect_to:
        return RedirectResponse(f"/c/{view.redirect_to}", status_code=301)
    payload = view.payload()
    etag = page_etag(
        view.live.version_id if view.live else "none",
        view.over,
        page_templates.etag,
        orjson.dumps(payload.get("ended")),
    )
    headers = {
        "Content-Security-Policy": CSP,
        "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
        "ETag": etag,
    }
    if not_modified(request, etag):
        return Response(status_code=304, headers=headers)
    template = await page_templates.get(settings)
    meta = meta_for(
        payload.get("doc"), view.name, f"{settings.public_base_url}/c/{view.slug}", settings.public_base_url
    )
    fonts = preload_fonts(payload.get("doc"))
    return HTMLResponse(render_page(template, meta, orjson.dumps(payload), fonts), headers=headers)


@router.get("/campaigns/{slug}", response_model=None)
async def public_doc(
    request: Request, session: SessionDep, slug: str = SlugParam, _rl: None = rate_limit("120/minute", "doc")
) -> Response:
    view = await service.resolve(session, slug)
    payload = view.payload()
    etag = page_etag(view.live.version_id if view.live else "none", view.over, orjson.dumps(payload.get("ended")))
    headers = {"ETag": etag, "Cache-Control": "public, max-age=30"}
    if not_modified(request, etag):
        return Response(status_code=304, headers=headers)
    return JSONResponse(payload, headers=headers)


@router.get("/dev/{token}", response_model=None)
async def dev_doc(
    request: Request,
    session: SessionDep,
    token: str = Path(min_length=8, max_length=64),
    _rl: None = rate_limit("120/minute", "dev"),
) -> Response:
    payload = await service.dev_view(session, token)
    etag = f'"{payload["hash"]}"'
    headers = {"ETag": etag, "Cache-Control": "no-cache", "X-Robots-Tag": "noindex"}
    if not_modified(request, etag):
        return Response(status_code=304, headers=headers)
    return JSONResponse(payload, headers=headers)


@router.post("/sessions")
async def upsert_session(
    body: SessionBody, session: SessionDep, _rl: None = rate_limit("30/minute", "session")
) -> dict[str, Any]:
    return await service.upsert_session(session, body)


@router.post("/sessions/{session_id}/events", status_code=202)
async def ingest_events(
    session_id: str,
    request: Request,
    session: SessionDep,
    _rl_session: None = rate_limit("120/minute", "events", path_param("session_id")),
    _rl_ip: None = rate_limit("600/minute", "events-ip"),
) -> dict[str, Any]:
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > L.events_body_bytes:
        raise PayloadTooLarge("Too many events")
    raw = await request.body()
    if len(raw) > L.events_body_bytes:
        raise PayloadTooLarge("Too many events")
    accepted = await service.ingest_events(session, session_id, service.decode_events(raw))
    return {"accepted": accepted}


@router.post("/sessions/{session_id}/submit")
async def submit(
    session_id: str,
    body: SubmitBody,
    session: SessionDep,
    _rl_session: None = rate_limit("10/minute", "submit", path_param("session_id")),
    _rl_ip: None = rate_limit("30/minute", "submit-ip"),
) -> dict[str, Any]:
    return await service.submit(session, session_id, body)


@router.post("/sessions/{session_id}/assist")
async def assist(
    session_id: str,
    body: AssistBody,
    request: Request,
    session: SessionDep,
    settings: SettingsDep,
    _rl_session: None = rate_limit("20/minute", "assist", path_param("session_id")),
    _rl_ip: None = rate_limit("60/minute", "assist-ip"),
) -> dict[str, Any]:
    from app.modules.assistant import service as assistant

    row, doc = await service.assist_context(session, session_id)
    await enforce(request, DAILY_ASSIST, f"assist-day:{row.campaign_id}")
    return await assistant.answer(
        session,
        settings,
        campaign_id=row.campaign_id,
        version_key=row.version_id or f"draft:{row.draft_revision}",
        doc=doc,
        question=body.question,
        step_id=body.step_id,
    )
