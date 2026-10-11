import re


def sanitize_fragment(value: str) -> str:
    base = re.sub(r"[^a-z0-9_-]+", "-", value.strip().lower()).strip("-") or "id"
    if not base[0].isalpha():
        base = f"x{base}"
    return base


class IdRegistry:
    def __init__(self) -> None:
        self.seen: set[str] = set()

    def make(self, prefix: str, source: str) -> str:
        body = sanitize_fragment(source)
        base = f"{prefix}_{body}"[:21]
        if len(base) < 6:
            base = base.ljust(6, "x")
        candidate = base
        n = 2
        while candidate in self.seen:
            suffix = f"-{n}"
            candidate = base[: 21 - len(suffix)] + suffix
            n += 1
        self.seen.add(candidate)
        return candidate
