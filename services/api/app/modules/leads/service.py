import csv
import datetime
import io
from collections.abc import AsyncIterator
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ValidationFailed
from app.core.logging import log_event
from app.modules.campaigns import service as campaigns
from app.modules.journeys import service as journeys
from app.modules.leads import repo, webhooks
from app.modules.leads.models import Lead

FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.UTC)


async def duplicates(session: AsyncSession, campaign_id: str, unique: dict[str, str], include_test: bool) -> list[str]:
    if not unique:
        return []
    email = next((v.split(":", 1)[1] for v in unique.values() if v.startswith("email:")), None)
    phone = next((v.split(":", 1)[1] for v in unique.values() if v.startswith("phone:")), None)
    taken = await repo.exists_contact(session, campaign_id, email, phone, include_test)
    return [key for key, value in unique.items() if value.split(":", 1)[0] in taken]


async def record_lead(
    session: AsyncSession,
    *,
    campaign_id: str,
    session_id: Any,
    version_id: str | None,
    element_id: str,
    answers: dict[str, Any],
    labels: dict[str, str],
    consent: dict[str, Any] | None,
    utm: dict[str, Any],
    email: str | None,
    phone: str | None,
    is_test: bool,
) -> str:
    lead = await repo.insert(
        session,
        {
            "campaign_id": campaign_id,
            "session_id": session_id,
            "version_id": version_id,
            "element_id": element_id,
            "data": {"answers": answers, "labels": labels, "consent": consent, "utm": utm},
            "normalized_email": email,
            "normalized_phone": phone,
            "is_test": is_test,
        },
    )
    log_event("lead recorded", event="lead", campaign_id=campaign_id, test=is_test)
    hook = await journeys.leads_webhook(session, campaign_id)
    if hook and hook.get("enabled", True) and hook.get("url") and not is_test:
        from app.modules.leads.tasks import deliver_webhook

        await deliver_webhook.configure(queueing_lock=f"lead:{lead.id}").defer_async(lead_id=lead.id)
    return lead.id


def lead_payload(lead: Lead) -> dict[str, Any]:
    return {
        "campaignId": lead.campaign_id,
        "leadId": lead.id,
        "submittedAt": lead.created_at.isoformat(),
        "answers": lead.data.get("answers", {}),
        "consent": lead.data.get("consent"),
        "utm": lead.data.get("utm", {}),
        "test": lead.is_test,
    }


async def deliver_lead(session: AsyncSession, lead_id: str, attempt: int) -> bool:
    lead = await repo.get(session, lead_id)
    if lead is None:
        return True
    hook = await journeys.leads_webhook(session, lead.campaign_id)
    if not hook or not hook.get("url") or not hook.get("enabled", True):
        return True
    campaign = await campaigns.get(session, lead.campaign_id)
    result = await webhooks.deliver(
        hook["url"], webhooks.payload(lead_payload(lead)), campaign.webhook_secret, f"{lead.id}:{attempt}"
    )
    await repo.record_delivery(session, lead.id, attempt, result.status_code, result.error, result.delivered)
    log_event(
        "webhook delivery",
        event="webhook",
        campaign_id=lead.campaign_id,
        status=result.status_code,
        delivered=result.delivered,
        retry=attempt,
    )
    return result.delivered


async def send_test(session: AsyncSession, campaign_id: str) -> dict[str, Any]:
    hook = await journeys.leads_webhook(session, campaign_id)
    if not hook or not hook.get("url"):
        raise ValidationFailed("Add a webhook address first", field="leadsWebhook.url")
    campaign = await campaigns.get(session, campaign_id)
    sample = {
        "campaignId": campaign_id,
        "leadId": "test-lead",
        "submittedAt": utcnow().isoformat(),
        "answers": {"name": "Test Lead", "email": "test@example.com"},
        "consent": None,
        "utm": {},
        "test": True,
    }
    result = await webhooks.deliver(hook["url"], webhooks.payload(sample), campaign.webhook_secret)
    return {"delivered": result.delivered, "statusCode": result.status_code, "error": result.error}


async def webhook_status(session: AsyncSession, campaign_id: str) -> dict[str, Any] | None:
    last = await repo.last_delivery(session, campaign_id)
    if last is None:
        return None
    return {
        "delivered": last.delivered_at is not None,
        "statusCode": last.status_code,
        "error": last.error,
        "at": last.created_at.isoformat(),
    }


def parse_cursor(cursor: str | None) -> tuple[datetime.datetime, str] | None:
    if not cursor:
        return None
    stamp, _, last_id = cursor.partition("|")
    try:
        return datetime.datetime.fromisoformat(stamp), last_id
    except ValueError as exc:
        raise ValidationFailed("Invalid cursor") from exc


def lead_view(lead: Lead) -> dict[str, Any]:
    return {
        "id": lead.id,
        "createdAt": lead.created_at.isoformat(),
        "answers": lead.data.get("answers", {}),
        "labels": lead.data.get("labels", {}),
        "consent": lead.data.get("consent"),
        "utm": lead.data.get("utm", {}),
        "test": lead.is_test,
    }


async def list_page(
    session: AsyncSession, campaign_id: str, limit: int, cursor: str | None, include_test: bool
) -> dict[str, Any]:
    rows = await repo.page(session, campaign_id, limit + 1, parse_cursor(cursor), include_test)
    next_cursor = None
    if len(rows) > limit:
        rows = rows[:limit]
        next_cursor = f"{rows[-1].created_at.isoformat()}|{rows[-1].id}"
    return {"items": [lead_view(r) for r in rows], "nextCursor": next_cursor}


def safe_cell(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "yes" if value else "no"
    if isinstance(value, list):
        value = ", ".join(str(v) for v in value)
    text = str(value)
    return f"'{text}" if text.startswith(FORMULA_PREFIXES) else text


async def csv_rows(session: AsyncSession, campaign_id: str, include_test: bool) -> AsyncIterator[str]:
    leads: list[Lead] = []
    cursor: tuple[datetime.datetime, str] | None = None
    while True:
        batch = await repo.page(session, campaign_id, 500, cursor, include_test)
        leads.extend(batch)
        if len(batch) < 500 or len(leads) >= 50000:
            break
        cursor = (batch[-1].created_at, batch[-1].id)
    keys: dict[str, str] = dict(await journeys.answer_columns(session, campaign_id))
    utm_keys: set[str] = set()
    for lead in leads:
        for key in lead.data.get("answers", {}):
            keys.setdefault(key, lead.data.get("labels", {}).get(key, key))
        utm_keys.update(lead.data.get("utm", {}).keys())
    utm = sorted(utm_keys)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Submitted at", *keys.values(), *utm, "Consent text", "Test"])
    yield buffer.getvalue()
    for lead in leads:
        buffer.seek(0)
        buffer.truncate()
        answers = lead.data.get("answers", {})
        consent = lead.data.get("consent") or {}
        writer.writerow(
            [
                lead.created_at.isoformat(),
                *(safe_cell(answers.get(k)) for k in keys),
                *(safe_cell(lead.data.get("utm", {}).get(k)) for k in utm),
                safe_cell(consent.get("text")),
                safe_cell(lead.is_test),
            ]
        )
        yield buffer.getvalue()
