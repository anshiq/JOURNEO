from typing import Any

from cachetools import TTLCache

_live = TTLCache[str, Any](maxsize=2048, ttl=30)
_versions = TTLCache[str, Any](maxsize=512, ttl=600)
MISSING = object()


def get_live(campaign_id: str) -> Any:
    return _live.get(campaign_id, MISSING)


def set_live(campaign_id: str, value: Any) -> None:
    _live[campaign_id] = value


def invalidate(campaign_id: str) -> None:
    _live.pop(campaign_id, None)


def get_version(version_id: str) -> Any:
    return _versions.get(version_id)


def set_version(version_id: str, value: Any) -> None:
    _versions[version_id] = value


def clear() -> None:
    _live.clear()
    _versions.clear()
