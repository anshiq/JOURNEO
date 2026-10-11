from typing import Any

from httpx import AsyncClient

from tests.integration.helpers import new_campaign, workspace

BRIEF = "Cold brew for busy mornings."


def headings(doc: dict[str, Any]) -> list[str]:
    return [
        el["props"]["text"]
        for screen in doc["screens"].values()
        for el in screen["elements"]
        if el["type"] == "heading"
    ]


async def test_generation_without_a_model_builds_from_the_brief(client: AsyncClient) -> None:
    campaign = await new_campaign(client)
    resp = await client.post(
        f"/api/v1/campaigns/{campaign['id']}/journey/generate",
        json={"brief": BRIEF, "goal": "leads", "tone": "playful"},
    )
    assert resp.status_code == 202, resp.text
    job_id = resp.json()["jobId"]
    status = (await client.get(f"/api/v1/campaigns/{campaign['id']}/journey/generate/{job_id}")).json()
    assert status["status"] == "done"
    assert status["stage"] == "done"
    doc = (await workspace(client, campaign["id"]))["draft"]["doc"]
    assert doc["theme"]["voice"] == "playful"
    assert "Cold brew for busy mornings" in headings(doc)


async def test_ai_start_without_a_model_uses_the_brief(client: AsyncClient) -> None:
    campaign = await new_campaign(client, brief=BRIEF, goal="leads", start={"mode": "ai"})
    doc = (await workspace(client, campaign["id"]))["draft"]["doc"]
    assert "Cold brew for busy mornings" in headings(doc)


async def test_generation_job_is_scoped_to_its_campaign(client: AsyncClient) -> None:
    first = await new_campaign(client)
    second = await new_campaign(client)
    job_id = (await client.post(f"/api/v1/campaigns/{first['id']}/journey/generate", json={"brief": BRIEF})).json()[
        "jobId"
    ]
    resp = await client.get(f"/api/v1/campaigns/{second['id']}/journey/generate/{job_id}")
    assert resp.status_code == 404


async def test_cancel_keeps_a_finished_job_finished(client: AsyncClient) -> None:
    campaign = await new_campaign(client)
    job_id = (await client.post(f"/api/v1/campaigns/{campaign['id']}/journey/generate", json={"brief": BRIEF})).json()[
        "jobId"
    ]
    resp = await client.post(f"/api/v1/campaigns/{campaign['id']}/journey/generate/{job_id}/cancel")
    assert resp.status_code == 200
    assert resp.json()["status"] == "done"
    assert resp.json()["cancelRequested"] is False


async def test_creator_ai_is_unavailable_without_a_model(client: AsyncClient) -> None:
    rewrite = await client.post("/api/v1/ai/rewrite", json={"text": "Shop now"})
    assert rewrite.status_code == 503
    screen = await client.post("/api/v1/ai/rewrite-screen", json={"texts": [{"id": "t1", "text": "Hi"}]})
    assert screen.status_code == 503
    theme = await client.post("/api/v1/ai/theme", json={"prompt": "calm and green"})
    assert theme.status_code == 503
    alt = await client.post("/api/v1/ai/alt-text", json={"url": "https://example.com/a.jpg"})
    assert alt.status_code == 200
    assert alt.json() == {"alt": ""}


async def test_creator_ai_validates_input_before_the_model(client: AsyncClient) -> None:
    empty_text = await client.post("/api/v1/ai/rewrite", json={"text": ""})
    assert empty_text.status_code == 422
    empty_theme = await client.post("/api/v1/ai/theme", json={})
    assert empty_theme.status_code == 422
    extra = await client.post("/api/v1/ai/rewrite", json={"text": "Shop now", "model": "x"})
    assert extra.status_code == 422
