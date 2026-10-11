import datetime
import re
from dataclasses import dataclass, field
from typing import Any

from email_validator import EmailNotValidError, validate_email

FIELD_MAX = {"name": 100, "email": 254, "phone": 32, "company": 120, "text": 250, "longtext": 2000, "dropdown": 100}
PHONE_CLEAN = re.compile(r"[^\d+]")


@dataclass(slots=True)
class Submission:
    answers: dict[str, Any] = field(default_factory=dict)
    labels: dict[str, str] = field(default_factory=dict)
    errors: dict[str, str] = field(default_factory=dict)
    unique: dict[str, str] = field(default_factory=dict)
    email: str | None = None
    phone: str | None = None
    consent_text: str | None = None


class FormNotFound(Exception):
    pass


def find_form(doc: dict[str, Any], step_id: str, element_id: str) -> dict[str, Any]:
    screen = (doc.get("screens") or {}).get(step_id)
    if not isinstance(screen, dict):
        raise FormNotFound(step_id)
    for el in screen.get("elements", []):
        if el.get("id") == element_id and el.get("type") == "form":
            return el
    raise FormNotFound(element_id)


def normalize_phone(value: str) -> str | None:
    digits = PHONE_CLEAN.sub("", value)
    plus = digits.startswith("+")
    digits = digits.replace("+", "")
    if not 6 <= len(digits) <= 20:
        return None
    return ("+" if plus else "") + digits


def check_field(kind: str, raw: Any, spec: dict[str, Any]) -> tuple[Any, str | None]:
    if kind == "consent":
        return raw is True or raw == "true", None
    if raw is None or (isinstance(raw, str) and not raw.strip()):
        return None, None
    if kind == "number":
        try:
            number = float(raw)
        except (TypeError, ValueError):
            return None, "Enter a number"
        low, high = spec.get("min"), spec.get("max")
        if low is not None and number < low:
            return None, f"Enter {low:g} or more"
        if high is not None and number > high:
            return None, f"Enter {high:g} or less"
        return number, None
    value = str(raw).strip()
    if len(value) > FIELD_MAX.get(kind, 250):
        return None, "This answer is too long"
    if kind == "email":
        try:
            return validate_email(value, check_deliverability=False).normalized, None
        except EmailNotValidError:
            return None, "Enter a valid email address"
    if kind == "phone":
        phone = normalize_phone(value)
        return (value, None) if phone else (None, "Enter a valid phone number")
    if kind == "date":
        try:
            datetime.date.fromisoformat(value[:10])
        except ValueError:
            return None, "Enter a valid date"
        return value[:10], None
    if kind == "dropdown":
        options = [str(o) for o in spec.get("options") or []]
        return (value, None) if value in options else (None, "Choose one of the options")
    return value, None


def validate_submission(doc: dict[str, Any], step_id: str, element_id: str, answers: dict[str, Any]) -> Submission:
    form = find_form(doc, step_id, element_id)
    result = Submission()
    for spec in form.get("props", {}).get("fields", []):
        key, kind = spec.get("key", ""), spec.get("kind", "text")
        value, problem = check_field(kind, answers.get(key), spec)
        if problem:
            result.errors[key] = problem
            continue
        empty = value is None or value is False
        if spec.get("required") and empty:
            result.errors[key] = "Please accept to continue" if kind == "consent" else "This field is required"
            continue
        if value is None:
            continue
        result.answers[key] = value
        result.labels[key] = str(spec.get("label", key))
        if kind == "email" and result.email is None:
            result.email = str(value).lower()
        if kind == "phone" and result.phone is None:
            result.phone = normalize_phone(str(value))
        if kind == "consent" and value is True:
            result.consent_text = str(spec.get("consentText") or spec.get("label") or "")
        if spec.get("unique") and kind in ("email", "phone"):
            normalized = str(value).lower() if kind == "email" else normalize_phone(str(value)) or ""
            result.unique[key] = f"{kind}:{normalized}"
    return result
