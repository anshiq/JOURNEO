from typing import Annotated, Any, Literal

from fastapi import APIRouter, File, Form, Response, UploadFile
from pydantic import BaseModel, ConfigDict, Field

from app.core.deps import EditorGuard, SessionDep, SettingsDep
from app.core.errors import PayloadTooLarge, UnsupportedMedia, ValidationFailed
from app.modules.assistant import extract, service
from app.modules.journeys.domain.limits import L

router = APIRouter(prefix="/api/v1/campaigns/{campaign_id}/knowledge", dependencies=[EditorGuard], tags=["knowledge"])
MAX_PDF = 10 * 1024 * 1024


class SourceBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["url", "qa"]
    url: str | None = Field(default=None, max_length=L.url)
    title: str | None = Field(default=None, max_length=200)
    question: str | None = Field(default=None, max_length=L.suggested_question * 2)
    answer: str | None = Field(default=None, max_length=L.long_answer)


class PlaygroundBody(BaseModel):
    question: str = Field(min_length=1, max_length=L.playground_question)


@router.get("/sources")
async def list_sources(campaign_id: str, session: SessionDep) -> dict[str, Any]:
    await service.ensure_campaign(session, campaign_id)
    return {"items": await service.list_sources(session, campaign_id)}


@router.post("/sources", status_code=201)
async def add_source(campaign_id: str, body: SourceBody, session: SessionDep) -> dict[str, Any]:
    await service.ensure_campaign(session, campaign_id)
    if body.kind == "url":
        source = await service.add_url_source(session, campaign_id, body.url or "", body.title)
    else:
        source = await service.add_qa_source(session, campaign_id, body.question or "", body.answer or "")
    return {"source": service.source_view(source)}


@router.post("/sources/pdf", status_code=201)
async def add_pdf(
    campaign_id: str,
    session: SessionDep,
    file: Annotated[UploadFile, File()],
    title: Annotated[str | None, Form(max_length=200)] = None,
) -> dict[str, Any]:
    await service.ensure_campaign(session, campaign_id)
    data = await file.read(MAX_PDF + 1)
    if len(data) > MAX_PDF:
        raise PayloadTooLarge("PDFs can be up to 10 MB")
    if not data.startswith(b"%PDF"):
        raise UnsupportedMedia("Upload a PDF file")
    try:
        text = await extract.from_pdf(data)
    except Exception as exc:
        raise ValidationFailed("This PDF could not be read") from exc
    source = await service.add_pdf_source(session, campaign_id, title or file.filename or "PDF", text)
    return {"source": service.source_view(source)}


@router.delete("/sources/{source_id}", status_code=204)
async def delete_source(campaign_id: str, source_id: str, session: SessionDep) -> Response:
    await service.delete_source(session, campaign_id, source_id)
    return Response(status_code=204)


@router.post("/sources/{source_id}/retry")
async def retry_source(campaign_id: str, source_id: str, session: SessionDep) -> dict[str, Any]:
    return {"source": await service.retry_source(session, campaign_id, source_id)}


@router.post("/playground")
async def playground(
    campaign_id: str, body: PlaygroundBody, session: SessionDep, settings: SettingsDep
) -> dict[str, Any]:
    await service.ensure_campaign(session, campaign_id)
    return await service.playground(session, settings, campaign_id, body.question)
