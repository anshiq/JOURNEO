from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.errors import problem

DEFAULT_LIMIT = 2 * 1024 * 1024
UPLOAD_LIMIT = 16 * 1024 * 1024


class PayloadTooLargeSignal(Exception):
    pass


def limit_for(path: str) -> int:
    return UPLOAD_LIMIT if path.startswith("/api/v1/files") or path.endswith("/sources/pdf") else DEFAULT_LIMIT


class BodyLimitMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        limit = limit_for(str(scope.get("path", "")))
        headers: dict[bytes, bytes] = dict(scope.get("headers", []))
        declared = headers.get(b"content-length")
        too_large = problem(413, "payload_too_large", "Payload too large", "The request is too large")
        if declared and declared.isdigit() and int(declared) > limit:
            await too_large(scope, receive, send)
            return
        received = 0

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > limit:
                    raise PayloadTooLargeSignal
            return message

        try:
            await self.app(scope, limited_receive, send)
        except PayloadTooLargeSignal:
            await too_large(scope, receive, send)
