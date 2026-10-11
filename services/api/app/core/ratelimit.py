import time
from collections.abc import Callable

from fastapi import Depends, Request
from limits import RateLimitItem, parse
from limits.aio.strategies import MovingWindowRateLimiter
from limits.storage import storage_from_string

from app.core.errors import RateLimited

_limiters: dict[str, MovingWindowRateLimiter] = {}


def limiter_for(uri: str) -> MovingWindowRateLimiter:
    limiter = _limiters.get(uri)
    if limiter is None:
        limiter = MovingWindowRateLimiter(storage_from_string(uri))
        _limiters[uri] = limiter
    return limiter


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


async def enforce(request: Request, item: RateLimitItem, identity: str) -> None:
    settings = request.app.state.settings
    if not settings.rate_limit_enabled:
        return
    limiter = limiter_for(settings.rate_limit_storage_uri)
    if not await limiter.hit(item, identity):
        stats = await limiter.get_window_stats(item, identity)
        raise RateLimited("Too many requests", retryAfter=max(1, int(stats.reset_time - time.time())))


def rate_limit(spec: str, scope: str, key: Callable[[Request], str] = client_ip):
    items = [parse(part) for part in spec.split(";")]

    async def dependency(request: Request) -> None:
        ident = key(request)
        for item in items:
            await enforce(request, item, f"{scope}:{item}:{ident}")

    return Depends(dependency)


def path_param(name: str) -> Callable[[Request], str]:
    def key(request: Request) -> str:
        return str(request.path_params.get(name, "unknown"))[:64]

    return key
