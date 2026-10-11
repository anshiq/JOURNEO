from types import SimpleNamespace
from typing import Any

import httpx
import pytest
from httpx import AsyncClient
from openai import RateLimitError
from sqlalchemy.ext.asyncio import AsyncSession
from tenacity import wait_fixed

from app.core import llm as llm_module
from app.core.config import LlmSettings
from app.modules.ai import service as ai_service
from app.modules.leads import service as leads_service
from tests.integration.helpers import new_campaign

BRIEF = "Cold brew for busy mornings."


class BusyCompletions:
    async def create(self, **kwargs: Any) -> None:
        request = httpx.Request("POST", "https://example.invalid/chat")
        raise RateLimitError("limited", response=httpx.Response(429, request=request), body=None)


async def test_second_generation_request_gets_a_conflict_with_the_active_job(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    campaign = await new_campaign(client)

    async def active(session: AsyncSession, campaign_id: str) -> SimpleNamespace:
        return SimpleNamespace(id="job_active")

    monkeypatch.setattr(ai_service.jobs, "active_for", active)
    resp = await client.post(f"/api/v1/campaigns/{campaign['id']}/journey/generate", json={"brief": BRIEF})
    assert resp.status_code == 409
    assert resp.json()["activeJobId"] == "job_active"


async def test_rate_limited_model_answers_429_not_500(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(llm_module, "wait_exponential_jitter", lambda **kwargs: wait_fixed(0))
    llm = llm_module.Llm(LlmSettings(mode="live", api_key="sk-test"))
    llm.client = SimpleNamespace(chat=SimpleNamespace(completions=BusyCompletions()))
    monkeypatch.setattr(ai_service, "make_llm", lambda settings: llm)
    resp = await client.post("/api/v1/ai/rewrite", json={"text": "Shop now"})
    assert resp.status_code == 429
    assert resp.json()["detail"] == llm_module.AI_BUSY


async def test_missing_lead_is_retried_not_treated_as_delivered(session: AsyncSession) -> None:
    assert await leads_service.deliver_lead(session, "lead_missing", 1) is False
