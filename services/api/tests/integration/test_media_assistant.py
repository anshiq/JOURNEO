import io

from PIL import Image
from sqlalchemy import select

from app.modules.assistant import ingest
from app.modules.assistant.models import KnowledgeSource
from tests.factories import lead_doc
from tests.integration.helpers import new_campaign, save


def png(width: int, height: int) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (width, height), (200, 30, 60)).save(buffer, "PNG")
    return buffer.getvalue()


async def test_upload_creates_webp_variants_without_s3(client):
    resp = await client.post("/api/v1/files", files={"file": ("photo.png", png(2000, 1000), "image/png")})
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["width"] == 2000
    assert body["dominantColor"] == "#c81e3c"
    assert body["srcset"].count("w") >= 3
    assert body["src"].endswith("_1280.webp")
    served = await client.get(body["src"])
    assert served.status_code == 200
    assert served.headers["content-type"] == "image/webp"
    assert "immutable" in served.headers["cache-control"]


async def test_upload_rejects_svg_and_garbage(client):
    svg = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    assert (await client.post("/api/v1/files", files={"file": ("x.svg", svg, "image/svg+xml")})).status_code == 415
    assert (
        await client.post("/api/v1/files", files={"file": ("x.png", b"not an image", "image/png")})
    ).status_code == 415


async def test_files_are_public_when_editor_token_set(app, client, settings):
    from pydantic import SecretStr

    upload = await client.post("/api/v1/files", files={"file": ("p.png", png(100, 100), "image/png")})
    app.state.settings = settings.model_copy(update={"editor_token": SecretStr("tok")})
    assert (await client.get(upload.json()["src"])).status_code == 200


async def test_video_presign_requires_s3(client):
    resp = await client.post(
        "/api/v1/files/video-presign", json={"filename": "a.mp4", "contentType": "video/mp4", "size": 1000}
    )
    assert resp.status_code == 409


async def add_qa(client, campaign_id: str, question: str, answer: str) -> str:
    resp = await client.post(
        f"/api/v1/campaigns/{campaign_id}/knowledge/sources",
        json={"kind": "qa", "question": question, "answer": answer},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["source"]["id"]


async def test_knowledge_is_campaign_scoped(client, session, task_queue):
    first = await new_campaign(client, name="First")
    second = await new_campaign(client, name="Second")
    await add_qa(client, first["id"], "What is the price?", "The bundle costs 49 dollars per month.")
    await add_qa(client, second["id"], "Shipping?", "Shipping takes three days.")
    assert len([j for j in task_queue.jobs.values() if j["task_name"] == "assistant.ingest_source"]) == 2
    for source in (await session.execute(select(KnowledgeSource))).scalars().all():
        await ingest.ingest(session, source)
    resp = await client.post(
        f"/api/v1/campaigns/{first['id']}/knowledge/playground", json={"question": "How much is the price?"}
    )
    body = resp.json()
    assert body["fallback"] is False
    assert "49 dollars" in body["answer"]
    assert body["citations"][0]["title"] == "What is the price?"
    cross = await client.post(
        f"/api/v1/campaigns/{second['id']}/knowledge/playground", json={"question": "How much is the price?"}
    )
    assert cross.json()["fallback"] is True
    listing = (await client.get(f"/api/v1/campaigns/{first['id']}/knowledge/sources")).json()["items"]
    assert listing[0]["status"] == "ready"


async def test_knowledge_rejects_private_urls_and_scopes_delete(client, session):
    campaign = await new_campaign(client)
    resp = await client.post(
        f"/api/v1/campaigns/{campaign['id']}/knowledge/sources", json={"kind": "url", "url": "http://127.0.0.1/admin"}
    )
    source_id = resp.json()["source"]["id"]
    source = await session.get(KnowledgeSource, source_id)
    await ingest.ingest(session, source)
    assert source.status == "failed"
    other = await new_campaign(client, name="Other")
    assert (await client.delete(f"/api/v1/campaigns/{other['id']}/knowledge/sources/{source_id}")).status_code == 404
    assert (await client.delete(f"/api/v1/campaigns/{campaign['id']}/knowledge/sources/{source_id}")).status_code == 204


async def test_chat_readiness_feeds_validation(client):
    campaign = await new_campaign(client)
    doc = lead_doc()
    doc["assistant"] = {"greeting": "Hi"}
    resp = await save(client, campaign["id"], doc)
    assert "W_CHAT_SOURCES" in {i["code"] for i in resp.json()["issues"]}
