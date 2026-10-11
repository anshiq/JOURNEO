from typing import Any

from fastapi import APIRouter, Response
from fastapi.responses import JSONResponse

from app.core.deps import EditorGuard, SessionDep
from app.core.errors import NotFound, problem
from app.modules.journeys import library, service
from app.modules.journeys.schemas import (
    DraftBody,
    EditorStateBody,
    OpsBody,
    PublishBody,
    RestoreBody,
    ValidateBody,
)

router = APIRouter(prefix="/api/v1", dependencies=[EditorGuard], tags=["journeys"])
BASE = "/campaigns/{campaign_id}/journey"


@router.get(BASE)
async def get_workspace(campaign_id: str, session: SessionDep) -> dict[str, Any]:
    return await service.get_workspace(session, campaign_id)


@router.put(f"{BASE}/draft", response_model=None)
async def put_draft(campaign_id: str, body: DraftBody, session: SessionDep) -> dict[str, Any] | JSONResponse:
    result = await service.save_draft(session, campaign_id, body.base_revision, body.doc)
    if result.conflict:
        return problem(
            409,
            "revision_conflict",
            "Revision conflict",
            "Changed in another tab or by someone else",
            serverRevision=result.revision,
            serverDoc=result.server_doc,
            serverHash=result.hash,
        )
    return {
        "revision": result.revision,
        "hash": result.hash,
        "issues": [i.as_dict() for i in result.issues],
        "issuesRevision": result.revision,
    }


@router.post(f"{BASE}/validate")
async def validate_doc(campaign_id: str, body: ValidateBody, session: SessionDep) -> dict[str, Any]:
    issues = await service.check(session, campaign_id, body.doc)
    return {"issues": [i.as_dict() for i in issues]}


@router.post(f"{BASE}/publish")
async def publish(campaign_id: str, body: PublishBody, session: SessionDep) -> dict[str, Any]:
    result = await service.publish(session, campaign_id, body.revision, body.notes)
    return {
        "versionNo": result.version_no,
        "versionId": result.version_id,
        "publishedAt": result.published_at.isoformat(),
        "hash": result.doc_hash,
    }


@router.get(f"{BASE}/versions")
async def list_versions(campaign_id: str, session: SessionDep) -> dict[str, Any]:
    return {"items": await service.list_versions(session, campaign_id)}


@router.get(f"{BASE}/versions/{{version_no}}")
async def get_version(campaign_id: str, version_no: int, session: SessionDep) -> dict[str, Any]:
    return await service.version_doc(session, campaign_id, version_no)


@router.get(f"{BASE}/checkpoints")
async def list_checkpoints(campaign_id: str, session: SessionDep) -> dict[str, Any]:
    return {"items": await service.list_checkpoints(session, campaign_id)}


@router.get(f"{BASE}/checkpoints/{{checkpoint_id}}")
async def get_checkpoint(campaign_id: str, checkpoint_id: str, session: SessionDep) -> dict[str, Any]:
    return await service.checkpoint_doc(session, campaign_id, checkpoint_id)


@router.post(f"{BASE}/checkpoints", status_code=201)
async def create_checkpoint(campaign_id: str, session: SessionDep) -> dict[str, Any]:
    return {"id": await service.create_checkpoint(session, campaign_id, "manual")}


@router.post(f"{BASE}/restore")
async def restore(campaign_id: str, body: RestoreBody, session: SessionDep) -> dict[str, Any]:
    return await service.restore(session, campaign_id, body)


@router.put(f"{BASE}/ops")
async def set_ops(campaign_id: str, body: OpsBody, session: SessionDep) -> dict[str, Any]:
    return await service.set_ops(session, campaign_id, body)


@router.put(f"{BASE}/editor-state", status_code=204)
async def set_editor_state(campaign_id: str, body: EditorStateBody, session: SessionDep) -> Response:
    await service.set_editor_state(session, campaign_id, body)
    return Response(status_code=204)


@router.get("/library/templates")
async def list_templates(session: SessionDep, response: Response) -> dict[str, Any]:
    response.headers["Cache-Control"] = "private, max-age=60"
    builtin = [{**t, "source": "builtin"} for t in library.templates()]
    return {"items": builtin + await service.user_templates(session)}


@router.get("/library/templates/{template_id}")
async def get_template(template_id: str, session: SessionDep) -> dict[str, Any]:
    found = library.template(template_id) or await service.user_template(session, template_id)
    if found is None:
        raise NotFound("Template not found")
    return found


@router.get("/library/recipes")
async def list_recipes(response: Response) -> dict[str, Any]:
    response.headers["Cache-Control"] = "public, max-age=300"
    return {"items": library.recipes()}


@router.get("/library/presets")
async def list_presets(response: Response) -> dict[str, Any]:
    response.headers["Cache-Control"] = "public, max-age=300"
    return {"items": library.presets()}
