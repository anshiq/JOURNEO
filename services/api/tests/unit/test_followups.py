from contextlib import asynccontextmanager
from types import SimpleNamespace
from typing import Any

import httpx
import pytest
from openai import RateLimitError
from tenacity import wait_fixed

from app.core import db
from app.core import llm as llm_module
from app.core.config import LlmSettings
from app.core.errors import RateLimited
from app.modules.ai.mock import rewrite, rewrite_screen
from app.modules.assistant import repo as assistant_repo
from app.modules.assistant import tasks as assistant_tasks


class RateLimitedCompletions:
    async def create(self, **kwargs: Any) -> None:
        request = httpx.Request("POST", "https://example.invalid/chat")
        raise RateLimitError("limited", response=httpx.Response(429, request=request), body=None)


def rate_limited_client() -> Any:
    return SimpleNamespace(chat=SimpleNamespace(completions=RateLimitedCompletions()))


async def test_rate_limited_upstream_becomes_a_busy_error(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(llm_module, "wait_exponential_jitter", lambda **kwargs: wait_fixed(0))
    client = llm_module.Llm(LlmSettings(mode="live", api_key="sk-test"))
    client.client = rate_limited_client()
    with pytest.raises(RateLimited) as caught:
        await client.complete_json(task="ai.rewrite", model="m", messages=[], max_tokens=10, timeout=1)
    assert caught.value.status == 429
    assert caught.value.detail == llm_module.AI_BUSY


def message(text: str, instruction: str) -> list[dict[str, Any]]:
    return [{"role": "user", "content": f"Instruction: {instruction}\nText: {text}"}]


@pytest.mark.parametrize("instruction", ["Shorter", "More persuasive", "Friendlier", "Simpler"])
def test_mock_rewrite_suggestions_differ_from_the_input(instruction: str) -> None:
    text = "Shop our new cold brew today."
    suggestions = rewrite(message(text, instruction))["suggestions"]
    assert len(suggestions) == 3
    assert all(suggestion and suggestion != text for suggestion in suggestions)


def test_mock_rewrite_screen_changes_every_text() -> None:
    prompt = [{"role": "user", "content": "- el_h00001 (max 140): Join the waitlist\n- el_b00001 (max 40): Sign up"}]
    texts = rewrite_screen(prompt)["texts"]
    assert texts == {"el_h00001": "Join the waitlist!", "el_b00001": "Sign up!"}


async def test_missing_source_is_raised_so_the_task_retries(monkeypatch: pytest.MonkeyPatch) -> None:
    @asynccontextmanager
    async def scope() -> Any:
        yield None

    async def missing(session: Any, source_id: str) -> None:
        return None

    monkeypatch.setattr(db, "session_scope", scope)
    monkeypatch.setattr(assistant_repo, "source_by_id", missing)
    with pytest.raises(assistant_tasks.SourceNotReady):
        await assistant_tasks.ingest_source.func("src_missing")
