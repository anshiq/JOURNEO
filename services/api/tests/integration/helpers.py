from typing import Any

from httpx import AsyncClient

from tests.factories import lead_doc


async def new_campaign(client: AsyncClient, **body: Any) -> dict[str, Any]:
    resp = await client.post("/api/v1/campaigns", json={"name": "Spring launch", **body})
    assert resp.status_code == 201, resp.text
    return resp.json()["campaign"]


async def workspace(client: AsyncClient, campaign_id: str) -> dict[str, Any]:
    resp = await client.get(f"/api/v1/campaigns/{campaign_id}/journey")
    assert resp.status_code == 200, resp.text
    return resp.json()


async def save(client: AsyncClient, campaign_id: str, doc: dict[str, Any], base: int | None = None) -> Any:
    if base is None:
        base = (await workspace(client, campaign_id))["draft"]["revision"]
    return await client.put(f"/api/v1/campaigns/{campaign_id}/journey/draft", json={"baseRevision": base, "doc": doc})


async def publish(client: AsyncClient, campaign_id: str) -> dict[str, Any]:
    revision = (await workspace(client, campaign_id))["draft"]["revision"]
    resp = await client.post(f"/api/v1/campaigns/{campaign_id}/journey/publish", json={"revision": revision})
    assert resp.status_code == 200, resp.text
    return resp.json()


async def live_campaign(client: AsyncClient, doc: dict[str, Any] | None = None) -> dict[str, Any]:
    campaign = await new_campaign(client)
    resp = await save(client, campaign["id"], doc or lead_doc())
    assert resp.status_code == 200, resp.text
    await publish(client, campaign["id"])
    return campaign
