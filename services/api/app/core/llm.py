import base64
import json
import re
import time
from collections.abc import Callable
from typing import Any, Protocol, cast

from openai import APIConnectionError, APIStatusError, AsyncOpenAI, RateLimitError
from tenacity import AsyncRetrying, retry_if_exception, stop_after_attempt, wait_exponential_jitter

from app.core.config import LlmSettings
from app.core.logging import log_event

_FENCE = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL)


class LlmUnavailable(Exception):
    pass


class LlmOutputError(Exception):
    pass


def retryable(exc: BaseException) -> bool:
    return isinstance(exc, RateLimitError | APIConnectionError) or (
        isinstance(exc, APIStatusError) and exc.status_code >= 500
    )


def parse_json_payload(content: str) -> dict[str, Any]:
    text = content.strip()
    candidates = [text]
    candidates.extend(m.group(1).strip() for m in _FENCE.finditer(text))
    start, end = text.find("{"), text.rfind("}")
    if 0 <= start < end:
        candidates.append(text[start : end + 1])
    for candidate in candidates:
        try:
            value = json.loads(candidate)
        except ValueError:
            continue
        if isinstance(value, dict):
            return cast(dict[str, Any], value)
    raise LlmOutputError("LLM did not return a JSON object")


class LlmClient(Protocol):
    async def complete_json(
        self, *, task: str, model: str, messages: list[dict[str, Any]], max_tokens: int, timeout: float
    ) -> dict[str, Any]: ...

    async def describe_image(
        self, *, task: str, model: str, image: bytes, mime: str, prompt: str, max_tokens: int, timeout: float
    ) -> str: ...


class Llm:
    def __init__(self, settings: LlmSettings) -> None:
        self.settings = settings
        self.client = AsyncOpenAI(
            base_url=settings.base_url,
            api_key=settings.api_key.get_secret_value() or "unset",
            max_retries=0,
            timeout=settings.timeout_s,
        )

    async def complete_json(
        self, *, task: str, model: str, messages: list[dict[str, Any]], max_tokens: int, timeout: float
    ) -> dict[str, Any]:
        start = time.perf_counter()
        async for attempt in AsyncRetrying(
            stop=stop_after_attempt(3),
            wait=wait_exponential_jitter(initial=1, max=8),
            retry=retry_if_exception(retryable),
            reraise=True,
        ):
            with attempt:
                response = await self.client.chat.completions.create(
                    model=model,
                    messages=cast(Any, messages),
                    max_tokens=max_tokens,
                    timeout=timeout,
                    response_format={"type": "json_object"},
                )
                content = response.choices[0].message.content or ""
                usage = response.usage
                log_event(
                    "llm complete",
                    event="llm",
                    task=task,
                    model=model,
                    prompt_tokens=usage.prompt_tokens if usage else None,
                    completion_tokens=usage.completion_tokens if usage else None,
                    duration_ms=int((time.perf_counter() - start) * 1000),
                )
                return parse_json_payload(content)
        raise LlmOutputError("unreachable")

    async def describe_image(
        self, *, task: str, model: str, image: bytes, mime: str, prompt: str, max_tokens: int, timeout: float
    ) -> str:
        start = time.perf_counter()
        data_url = f"data:{mime};base64,{base64.b64encode(image).decode()}"
        async for attempt in AsyncRetrying(
            stop=stop_after_attempt(3),
            wait=wait_exponential_jitter(initial=1, max=8),
            retry=retry_if_exception(retryable),
            reraise=True,
        ):
            with attempt:
                response = await self.client.chat.completions.create(
                    model=model,
                    messages=cast(
                        Any,
                        [
                            {
                                "role": "user",
                                "content": [
                                    {"type": "text", "text": prompt},
                                    {"type": "image_url", "image_url": {"url": data_url}},
                                ],
                            }
                        ],
                    ),
                    max_tokens=max_tokens,
                    timeout=timeout,
                )
                log_event(
                    "llm complete",
                    event="llm",
                    task=task,
                    model=model,
                    duration_ms=int((time.perf_counter() - start) * 1000),
                )
                return (response.choices[0].message.content or "").strip()
        raise LlmOutputError("unreachable")


MockHandler = Callable[[list[dict[str, Any]]], dict[str, Any]]


class MockLlm:
    handlers: dict[str, MockHandler] = {}
    alt_text: str = ""

    async def complete_json(
        self, *, task: str, model: str, messages: list[dict[str, Any]], max_tokens: int, timeout: float
    ) -> dict[str, Any]:
        handler = self.handlers.get(task)
        if handler is None:
            raise LlmOutputError(f"no mock for {task}")
        return handler(messages)

    async def describe_image(
        self, *, task: str, model: str, image: bytes, mime: str, prompt: str, max_tokens: int, timeout: float
    ) -> str:
        return type(self).alt_text


def register_mock(task: str, handler: MockHandler) -> None:
    MockLlm.handlers[task] = handler


def make_llm(settings: LlmSettings) -> LlmClient:
    if settings.mode == "mock":
        return MockLlm()
    if settings.mode == "off" or not settings.api_key.get_secret_value():
        raise LlmUnavailable("LLM is not configured")
    return Llm(settings)
