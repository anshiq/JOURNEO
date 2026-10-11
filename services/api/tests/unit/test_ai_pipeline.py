import json
import pathlib
from typing import Any, cast

import pytest

from app.core.config import LlmSettings, Settings
from app.core.llm import LlmClient, make_llm
from app.modules.ai import service
from app.modules.ai.mock import install
from app.modules.journeys import library
from app.modules.journeys.domain import compose
from app.modules.journeys.domain import validate as rules
from app.modules.journeys.domain.ids import sequential_ids
from app.modules.journeys.service import parse

BRIEFS: list[dict[str, Any]] = json.loads(
    (pathlib.Path(__file__).parents[4] / "contracts" / "ai" / "briefs.json").read_text()
)


class Broken:
    async def complete_json(self, **_: Any) -> dict[str, Any]:
        raise TimeoutError("model is slow")

    async def describe_image(self, **_: Any) -> str:
        raise TimeoutError("model is slow")


class ContentBroken:
    def __init__(self, inner: LlmClient) -> None:
        self.inner = inner

    async def complete_json(self, *, task: str, **kwargs: Any) -> dict[str, Any]:
        if task == "ai.content":
            raise TimeoutError("content is slow")
        return await self.inner.complete_json(task=task, **kwargs)

    async def describe_image(self, **kwargs: Any) -> str:
        return await self.inner.describe_image(**kwargs)


@pytest.fixture
def mock_llm(settings: Settings) -> LlmClient:
    library.load(settings)
    install()
    return make_llm(LlmSettings(mode="mock"))


@pytest.mark.parametrize("item", BRIEFS, ids=lambda b: f"{b['goal']}-{b['brief'][:18]}")
async def test_canned_briefs_build_valid_drafts(item: dict[str, Any], mock_llm: LlmClient) -> None:
    built = await service.build_draft(mock_llm, "mock", service.brief_of(item), {}, service.DetachedHooks())
    assert built.spec is not None
    assert built.fallback == []
    assert built.issues == []
    assert len(built.doc["screens"]) >= 3


async def test_outline_failure_falls_back_to_goal_template(settings: Settings) -> None:
    library.load(settings)
    built = await service.build_draft(
        cast(LlmClient, Broken()),
        "mock",
        service.brief_of({"goal": "leads", "brief": "Spring sale"}),
        {},
        service.DetachedHooks(),
    )
    assert built.spec is None
    assert built.issues == []
    assert built.fallback == service.screen_names(built.doc)


async def test_content_failure_marks_each_screen_as_fallback(mock_llm: LlmClient) -> None:
    built = await service.build_draft(
        cast(LlmClient, ContentBroken(mock_llm)),
        "mock",
        service.brief_of({"goal": "leads", "brief": "Spring sale"}),
        {},
        service.DetachedHooks(),
    )
    assert built.issues == []
    assert built.fallback
    assert set(built.fallback) <= set(service.screen_names(built.doc))


async def test_deterministic_doc_carries_brief_and_voice(settings: Settings) -> None:
    library.load(settings)
    brief = service.brief_of({"brief": "Cold brew for busy mornings.", "goal": "leads", "tone": "playful"})
    doc = service.deterministic_doc(brief)
    assert doc["theme"]["voice"] == "playful"
    headings = [
        el["props"]["text"]
        for screen in doc["screens"].values()
        for el in screen["elements"]
        if el["type"] == "heading"
    ]
    assert "Cold brew for busy mornings" in headings
    _, parsed, _ = parse(doc)
    assert rules.blocking(rules.validate(parsed)) == []


def test_terminal_screen_drops_exits_without_destination() -> None:
    spec = {
        "screens": [
            {"title": "Welcome", "recipe": "welcome", "elements": []},
            {
                "title": "Your match",
                "recipe": "product-picks",
                "ends": True,
                "elements": [
                    {"type": "heading", "props": {"text": "Your match", "level": 1}},
                    {
                        "type": "cards",
                        "props": {
                            "items": [
                                {
                                    "title": "Plus",
                                    "button": {"label": "Choose", "action": {"kind": "next"}},
                                }
                            ]
                        },
                    },
                    {
                        "type": "buttons",
                        "props": {"items": [{"label": "Start over", "variant": "link", "action": {"kind": "next"}}]},
                    },
                ],
            },
        ],
        "gotos": [],
        "branches": [],
    }
    doc = compose.compose(spec, sequential_ids(), library.recipes_by_id())
    _, parsed, _ = parse(doc)
    assert rules.blocking(rules.validate(parsed)) == []
