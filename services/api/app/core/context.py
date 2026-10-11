import logging
import time
import uuid

from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.logging import REQUEST_ID, log_event

QUIET = ("/health", "/ready")


class RequestContextMiddleware:
    def __init__(self, app: ASGIApp, service: str = "api") -> None:
        self.app = app
        self.service = service

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        rid = uuid.uuid4().hex[:12]
        token = REQUEST_ID.set(rid)
        start = time.perf_counter()
        status_holder: dict[str, int] = {}

        async def send_wrap(message: Message) -> None:
            if message["type"] == "http.response.start":
                status_holder["status"] = message.get("status", 500)
                headers = [*message.get("headers", []), (b"x-request-id", rid.encode())]
                message = {**message, "headers": headers}
            await send(message)

        try:
            await self.app(scope, receive, send_wrap)
        finally:
            path = str(scope.get("path", ""))
            log_event(
                "request handled",
                level=logging.DEBUG if path in QUIET else logging.INFO,
                method=scope.get("method"),
                path=path,
                status=status_holder.get("status", 500),
                duration_ms=int((time.perf_counter() - start) * 1000),
                service=self.service,
            )
            REQUEST_ID.reset(token)
