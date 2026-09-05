from fastapi import APIRouter, Query

from app.modules.files import service as S

router = APIRouter()
@router.post("/api/files/presign")
def presign_post(body: dict):
    fn = body.get("filename", body.get("fileName"))
    ct = body.get("contentType", body.get("fileType"))
    size = body.get("size")
    size = int(size) if size is not None else None
    return S.presign(fn, ct, size)
@router.get("/api/files/presign")
def presign_get(filename: str = Query(default=None), fileName: str = Query(default=None), contentType: str = Query(default=None), fileType: str = Query(default=None), size: int = Query(default=None)):
    return S.presign(filename or fileName, contentType or fileType, size)
