import logging
from typing import Any

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from starlette.applications import Starlette
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import log_event

PROBLEM = "application/problem+json"


class AppError(Exception):
    status: int = 400
    code: str = "bad_request"
    title: str = "Bad request"

    def __init__(self, detail: str, **extra: object) -> None:
        super().__init__(detail)
        self.detail = detail
        self.extra = extra


class NotFound(AppError):
    status = 404
    code = "not_found"
    title = "Not found"


class Conflict(AppError):
    status = 409
    code = "conflict"
    title = "Conflict"


class RevisionConflict(AppError):
    status = 409
    code = "revision_conflict"
    title = "Revision conflict"


class ValidationFailed(AppError):
    status = 422
    code = "validation_failed"
    title = "Validation failed"


class UnsupportedMedia(AppError):
    status = 415
    code = "unsupported_media"
    title = "Unsupported media"


class RateLimited(AppError):
    status = 429
    code = "rate_limited"
    title = "Too many requests"


class PayloadTooLarge(AppError):
    status = 413
    code = "payload_too_large"
    title = "Payload too large"


class Unauthorized(AppError):
    status = 401
    code = "editor_token_required"
    title = "Unauthorized"


class ServiceUnavailable(AppError):
    status = 503
    code = "unavailable"
    title = "Service unavailable"


def problem(status: int, code: str, title: str, detail: str, **extra: object) -> JSONResponse:
    body: dict[str, Any] = {
        "type": f"https://journeo.app/problems/{code}",
        "title": title,
        "status": status,
        "code": code,
        "detail": detail,
    }
    body.update(extra)
    return JSONResponse(body, status_code=status, media_type=PROBLEM)


def pydantic_errors(exc: ValidationError | RequestValidationError) -> list[dict[str, object]]:
    out: list[dict[str, object]] = []
    for err in exc.errors()[:50]:
        out.append({"loc": [str(p) for p in err.get("loc", ())], "msg": str(err.get("msg", ""))})
    return out


async def app_error_handler(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, AppError)
    if exc.status >= 500:
        log_event("request failed", level=logging.ERROR, path=request.url.path, status=exc.status, err=exc.detail)
    resp = problem(exc.status, exc.code, exc.title, exc.detail, **exc.extra)
    if isinstance(exc, RateLimited) and exc.extra.get("retryAfter") is not None:
        resp.headers["Retry-After"] = str(exc.extra["retryAfter"])
    return resp


async def model_error_handler(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, ValidationError | RequestValidationError)
    return problem(
        422, "validation_failed", "Validation failed", "The request is not valid", errors=pydantic_errors(exc)
    )


async def http_error_handler(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, StarletteHTTPException)
    code = "not_found" if exc.status_code == 404 else "http_error"
    return problem(exc.status_code, code, str(exc.detail), str(exc.detail))


async def unhandled_handler(request: Request, exc: Exception) -> JSONResponse:
    log_event(
        "request failed",
        level=logging.ERROR,
        path=request.url.path,
        status=500,
        err=type(exc).__name__,
        exc_info=exc,
    )
    return problem(500, "internal", "Internal error", "Internal error")


def install_error_handlers(app: Starlette) -> None:
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(ValidationError, model_error_handler)
    app.add_exception_handler(RequestValidationError, model_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_error_handler)
    app.add_exception_handler(Exception, unhandled_handler)
