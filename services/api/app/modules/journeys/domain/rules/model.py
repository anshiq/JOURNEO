from dataclasses import dataclass
from datetime import datetime
from typing import Any, Literal

Severity = Literal["error", "warning"]
TargetKind = Literal["step", "screen", "element", "item", "link", "theme", "assistant", "settings"]


@dataclass(frozen=True, slots=True)
class Target:
    kind: TargetKind
    id: str
    screen_id: str | None = None
    item_id: str | None = None
    field: str | None = None

    def as_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {"kind": self.kind, "id": self.id}
        if self.screen_id:
            out["screenId"] = self.screen_id
        if self.item_id:
            out["itemId"] = self.item_id
        if self.field:
            out["field"] = self.field
        return out


@dataclass(frozen=True, slots=True)
class Issue:
    code: str
    severity: Severity
    message: str
    target: Target
    fix: dict[str, str] | None = None

    def as_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {
            "code": self.code,
            "severity": self.severity,
            "message": self.message,
            "target": self.target.as_dict(),
        }
        if self.fix:
            out["fix"] = self.fix
        return out


@dataclass(frozen=True, slots=True)
class ValidationContext:
    now: datetime | None = None
    chat_ready: bool | None = None


def error(code: str, message: str, target: Target, fix: str | None = None) -> Issue:
    return Issue(code=code, severity="error", message=message, target=target, fix={"kind": fix} if fix else None)


def warning(code: str, message: str, target: Target, fix: str | None = None) -> Issue:
    return Issue(code=code, severity="warning", message=message, target=target, fix={"kind": fix} if fix else None)
