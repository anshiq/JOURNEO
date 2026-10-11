import logging
import re
import sys
from contextvars import ContextVar

REQUEST_ID: ContextVar[str | None] = ContextVar("request_id", default=None)
ORDER = (
    "method",
    "path",
    "status",
    "duration_ms",
    "request_id",
    "campaign_id",
    "session_id",
    "service",
    "err",
    "event",
    "retry",
)
logger = logging.getLogger("app")
_UNSAFE = re.compile(r"[\s\x00-\x1f\x7f]+")
_installed: list[logging.Handler] = []


class BelowWarning(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        return record.levelno < logging.WARNING


def setup_logging(level: str) -> None:
    root = logging.getLogger()
    if any(h in _installed for h in root.handlers):
        return
    fmt = logging.Formatter(style="{", fmt="{asctime} {levelname:<7} {name}: {message}", datefmt="%Y-%m-%d %H:%M:%S")
    out = logging.StreamHandler(sys.stdout)
    out.addFilter(BelowWarning())
    out.setFormatter(fmt)
    err = logging.StreamHandler(sys.stderr)
    err.setLevel(logging.WARNING)
    err.setFormatter(fmt)
    for handler in (out, err):
        _installed.append(handler)
        root.addHandler(handler)
    root.setLevel(level.upper())
    logging.getLogger("uvicorn.access").disabled = True


def token(value: object) -> str:
    text = str(value)
    return _UNSAFE.sub("_", text)[:300]


def log_event(message: str, level: int = logging.INFO, exc_info: BaseException | None = None, **ctx: object) -> None:
    rid = REQUEST_ID.get()
    if rid and "request_id" not in ctx:
        ctx["request_id"] = rid
    keys = [k for k in ORDER if k in ctx] + sorted(k for k in ctx if k not in ORDER)
    tail = " ".join(f"{k}={token(ctx[k])}" for k in keys if ctx[k] is not None)
    logger.log(level, "%s", f"{message} {tail}".rstrip(), exc_info=exc_info)
