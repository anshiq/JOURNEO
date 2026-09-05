import re
import uuid

from fastapi import HTTPException

from app.config import settings

ALLOWED_IMAGE = {"image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml", "image/avif"}
ALLOWED_VIDEO = {"video/mp4", "video/webm", "video/quicktime"}
def presign(filename, content_type, size):
    if not filename or not str(filename).strip():
        raise HTTPException(400, "filename is required")
    if not content_type or not str(content_type).strip():
        raise HTTPException(400, "contentType is required")
    is_image = str(content_type).startswith("image/")
    is_video = str(content_type).startswith("video/")
    if not is_image and not is_video:
        raise HTTPException(400, "only image and video uploads are allowed")
    if is_image and content_type not in ALLOWED_IMAGE:
        raise HTTPException(400, "unsupported image type")
    if is_video and content_type not in ALLOWED_VIDEO:
        raise HTTPException(400, "unsupported video type")
    if size is None or int(size) <= 0:
        raise HTTPException(400, "size is required")
    size = int(size)
    max_bytes = (settings.s3_max_image_mb if is_image else settings.s3_max_video_mb) * 1024 * 1024
    if size > max_bytes:
        raise HTTPException(400, "file too large")
    safe = re.sub(r"^.*[\\/]", "", str(filename))
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", safe)
    if len(safe) > 128:
        safe = safe[-128:]
    if not safe.strip("._-"):
        safe = "file"
    key = f"uploads/{uuid.uuid4()}-{safe}"
    upload_url = _presigned_put(key, content_type, size)
    public_url = _public_url(key)
    return {"uploadUrl": upload_url, "publicUrl": public_url, "key": key, "bucket": settings.s3_bucket, "expiresIn": settings.s3_presign_expiry_seconds}
def _s3_client():
    kwargs = {"region_name": settings.aws_region, "aws_access_key_id": settings.aws_access_key_id, "aws_secret_access_key": settings.aws_secret_access_key}
    if settings.aws_endpoint_url:
        kwargs["endpoint_url"] = settings.aws_endpoint_url
        kwargs["config"] = __import__("botocore.config", fromlist=["Config"]).Config(s3={"addressing_style": "path"})
    return __import__("boto3").client("s3", **kwargs)
def _presigned_put(key, content_type, size):
    try:
        s3 = _s3_client()
        try:
            s3.head_bucket(Bucket=settings.s3_bucket)
        except Exception:
            try:
                s3.create_bucket(Bucket=settings.s3_bucket)
            except Exception:
                pass
        return s3.generate_presigned_url("put_object", Params={"Bucket": settings.s3_bucket, "Key": key, "ContentType": content_type}, ExpiresIn=int(settings.s3_presign_expiry_seconds))
    except Exception:
        base = (settings.s3_public_endpoint or "").rstrip("/") or f"https://{settings.s3_bucket}.s3.{settings.aws_region}.amazonaws.com"
        return f"{base}/{key}?presign=local"
def _public_url(key):
    if settings.s3_public_endpoint:
        return f"{settings.s3_public_endpoint.rstrip('/')}/{key}"
    return f"https://{settings.s3_bucket}.s3.{settings.aws_region}.amazonaws.com/{key}"
