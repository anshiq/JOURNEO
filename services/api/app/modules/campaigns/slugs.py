import re

from app.modules.journeys.domain.ops import ascii_fold

SLUG_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$")
RESERVED = frozenset({"api", "assets", "fonts", "play", "admin", "new", "edit", "c", "d"})


def base_slug(value: str) -> str:
    raw = re.sub(r"[^a-z0-9]+", "-", ascii_fold((value or "").lower())).strip("-")[:60].strip("-")
    if not raw or raw in RESERVED:
        raw = f"{raw or 'campaign'}-link".strip("-")
    return raw


def is_valid(slug: str) -> bool:
    return bool(SLUG_RE.match(slug)) and slug not in RESERVED


def candidates(base: str):
    yield base
    n = 2
    while True:
        suffix = f"-{n}"
        yield base[: 60 - len(suffix)].rstrip("-") + suffix
        n += 1
