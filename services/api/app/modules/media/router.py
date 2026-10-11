from typing import Annotated, Any

from fastapi import APIRouter, File, Path, Query, Request, Response, UploadFile
from pydantic import BaseModel, ConfigDict, Field

from app.core.deps import EditorGuard, SessionDep, SettingsDep
from app.core.errors import NotFound, PayloadTooLarge, UnsupportedMedia
from app.core.ratelimit import rate_limit
from app.modules.media import service

router = APIRouter(prefix="/api/v1", dependencies=[EditorGuard], tags=["media"])
public_router = APIRouter(prefix="/api/v1", tags=["media"])


class VideoBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    filename: str = Field(max_length=200)
    content_type: str = Field(alias="contentType", max_length=60)
    size: int = Field(ge=1)


class ImportBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    url: str = Field(max_length=2048)


@router.post("/files", status_code=201)
async def upload(
    session: SessionDep,
    settings: SettingsDep,
    file: Annotated[UploadFile, File()],
    _rl: None = rate_limit("30/minute", "upload"),
) -> dict[str, Any]:
    limit = settings.storage.max_image_mb * 1024 * 1024
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise PayloadTooLarge(f"Images can be up to {settings.storage.max_image_mb} MB")
    head = data[:512].lstrip().lower()
    if head.startswith((b"<svg", b"<?xml")) or b"<svg" in head:
        raise UnsupportedMedia("SVG images are not supported, use PNG or JPG")
    return await service.upload_image(session, settings, data)


@router.post("/files/import", status_code=201)
async def import_image(body: ImportBody, session: SessionDep, settings: SettingsDep) -> dict[str, Any]:
    return await service.import_remote(session, settings, body.url)


@router.post("/files/video-presign")
async def video_presign(body: VideoBody, settings: SettingsDep) -> dict[str, Any]:
    if body.size > settings.storage.max_video_mb * 1024 * 1024:
        raise PayloadTooLarge(f"Videos can be up to {settings.storage.max_video_mb} MB")
    return await service.presign_video(settings, body.filename, body.content_type, body.size)


@router.get("/media/search")
async def stock_search(
    settings: SettingsDep, q: str = Query(min_length=1, max_length=100), _rl: None = rate_limit("60/minute", "stock")
) -> dict[str, Any]:
    return {"items": await service.search_stock(settings, q)}


@public_router.get("/files/{key}", response_model=None)
async def get_file(
    request: Request, session: SessionDep, key: str = Path(max_length=120, pattern=r"^[a-z0-9_.-]+$")
) -> Response:
    etag = f'"{key}"'
    headers = {"ETag": etag, "Cache-Control": "public, max-age=31536000, immutable"}
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers=headers)
    stored = await service.get_file(session, key)
    if stored is None:
        raise NotFound("File not found")
    return Response(stored.data, media_type=stored.mime, headers=headers)
