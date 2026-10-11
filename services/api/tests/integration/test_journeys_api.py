import copy

from sqlalchemy import select

from app.modules.journeys.models import JourneyCheckpoint
from tests.factories import lead_doc
from tests.integration.helpers import live_campaign, new_campaign, publish, save, workspace


async def test_new_campaign_starts_from_welcome_not_empty(client):
    campaign = await new_campaign(client)
    ws = await workspace(client, campaign["id"])
    assert ws["status"] == "draft"
    assert len(ws["draft"]["doc"]["screens"]) == 2
    resp = await client.post(f"/api/v1/campaigns/{campaign['id']}/journey/validate", json={"doc": ws["draft"]["doc"]})
    assert [i for i in resp.json()["issues"] if i["severity"] == "error"] == []


async def test_template_start_and_brand(client):
    campaign = await new_campaign(
        client, start={"mode": "template", "templateId": "product-quiz"}, brand={"color": "#ff0055"}
    )
    doc = (await workspace(client, campaign["id"]))["draft"]["doc"]
    assert doc["theme"]["colors"]["primary"] == "#ff0055"
    assert "scr_budget1" in doc["screens"]


async def test_draft_save_is_idempotent_and_conflicts(client, session):
    campaign = await new_campaign(client)
    doc = lead_doc()
    first = await save(client, campaign["id"], doc)
    assert first.status_code == 200
    revision = first.json()["revision"]
    retry = await save(client, campaign["id"], doc, base=revision - 1)
    assert retry.status_code == 200
    assert retry.json()["revision"] == revision
    changed = copy.deepcopy(doc)
    changed["screens"]["scr_thanks"]["elements"][0]["props"]["text"] = "Other tab"
    conflict = await save(client, campaign["id"], changed, base=revision - 1)
    assert conflict.status_code == 409
    body = conflict.json()
    assert conflict.headers["content-type"].startswith("application/problem+json")
    assert body["serverRevision"] == revision
    assert body["serverDoc"]["screens"]["scr_thanks"]["elements"][0]["props"]["text"] == "Thanks"
    reasons = (await session.execute(select(JourneyCheckpoint.reason))).scalars().all()
    assert "conflict_rejected" in reasons


async def test_structural_problems_are_422_not_500(client):
    campaign = await new_campaign(client)
    doc = lead_doc()
    doc["screens"]["scr_thanks"]["elements"][0]["props"]["text"] = "x" * 500
    resp = await save(client, campaign["id"], doc)
    assert resp.status_code == 422
    assert resp.json()["errors"]
    resp = await save(client, campaign["id"], {"schemaVersion": 4, "steps": []})
    assert resp.status_code == 422


async def test_oversized_doc_rejected(client):
    campaign = await new_campaign(client)
    doc = lead_doc()
    doc["theme"]["voice"] = "x"
    doc["padding"] = "y" * 1_100_000
    resp = await save(client, campaign["id"], doc)
    assert resp.status_code == 413


async def test_save_returns_item_level_issues(client):
    campaign = await new_campaign(client)
    doc = lead_doc()
    doc["screens"]["scr_welcome"]["elements"][1]["props"]["items"][0]["action"] = {"kind": "goto"}
    del doc["links"]["scr_welcome"]
    resp = await save(client, campaign["id"], doc)
    open_exits = [i for i in resp.json()["issues"] if i["code"] == "J_EXIT_OPEN"]
    assert open_exits[0]["target"] == {
        "kind": "item",
        "id": "el_btn001",
        "screenId": "scr_welcome",
        "itemId": "it_go00001",
        "field": "target",
    }


async def test_publish_isolation_and_versions(client):
    campaign = await live_campaign(client)
    slug = campaign["slug"]
    live = (await client.get(f"/api/v1/public/campaigns/{slug}")).json()
    assert live["doc"]["screens"]["scr_thanks"]["elements"][0]["props"]["text"] == "Thanks"
    doc = lead_doc()
    doc["screens"]["scr_thanks"]["elements"][0]["props"]["text"] = "Draft only"
    await save(client, campaign["id"], doc)
    again = (await client.get(f"/api/v1/public/campaigns/{slug}")).json()
    assert again["doc"]["screens"]["scr_thanks"]["elements"][0]["props"]["text"] == "Thanks"
    assert (await workspace(client, campaign["id"]))["status"] == "live_changes"
    second = await publish(client, campaign["id"])
    assert second["versionNo"] == 2
    latest = (await client.get(f"/api/v1/public/campaigns/{slug}")).json()
    assert latest["doc"]["screens"]["scr_thanks"]["elements"][0]["props"]["text"] == "Draft only"
    versions = (await client.get(f"/api/v1/campaigns/{campaign['id']}/journey/versions")).json()["items"]
    assert [v["versionNo"] for v in versions] == [2, 1]
    v1 = (await client.get(f"/api/v1/campaigns/{campaign['id']}/journey/versions/1")).json()
    assert v1["doc"]["screens"]["scr_thanks"]["elements"][0]["props"]["text"] == "Thanks"


async def test_publish_blocked_by_errors_with_targets(client):
    campaign = await new_campaign(client)
    doc = lead_doc()
    doc["screens"]["scr_thanks"]["elements"][0]["props"]["text"] = ""
    await save(client, campaign["id"], doc)
    revision = (await workspace(client, campaign["id"]))["draft"]["revision"]
    resp = await client.post(f"/api/v1/campaigns/{campaign['id']}/journey/publish", json={"revision": revision})
    assert resp.status_code == 422
    assert resp.json()["issues"][0]["target"]["id"] == "el_head02"


async def test_publish_stale_revision_conflicts(client):
    campaign = await new_campaign(client)
    await save(client, campaign["id"], lead_doc())
    resp = await client.post(f"/api/v1/campaigns/{campaign['id']}/journey/publish", json={"revision": 1})
    assert resp.status_code == 409


async def test_restore_version_and_checkpoint(client):
    campaign = await live_campaign(client)
    doc = lead_doc()
    doc["screens"]["scr_thanks"]["elements"][0]["props"]["text"] = "Changed"
    await save(client, campaign["id"], doc)
    restored = await client.post(f"/api/v1/campaigns/{campaign['id']}/journey/restore", json={"versionNo": 1})
    assert restored.status_code == 200
    assert restored.json()["doc"]["screens"]["scr_thanks"]["elements"][0]["props"]["text"] == "Thanks"
    checkpoints = (await client.get(f"/api/v1/campaigns/{campaign['id']}/journey/checkpoints")).json()["items"]
    before = next(c for c in checkpoints if c["reason"] == "before_restore")
    back = await client.post(f"/api/v1/campaigns/{campaign['id']}/journey/restore", json={"checkpointId": before["id"]})
    assert back.json()["doc"]["screens"]["scr_thanks"]["elements"][0]["props"]["text"] == "Changed"
    other = await new_campaign(client)
    stolen = await client.post(f"/api/v1/campaigns/{other['id']}/journey/restore", json={"checkpointId": before["id"]})
    assert stolen.status_code == 404


async def test_ops_pause_end_and_ended_page(client):
    campaign = await live_campaign(client)
    base = f"/api/v1/campaigns/{campaign['id']}/journey/ops"
    resp = await client.put(base, json={"paused": True, "ended": {"kind": "message", "message": "See you soon"}})
    assert resp.status_code == 200
    public = (await client.get(f"/api/v1/public/campaigns/{campaign['slug']}")).json()
    assert public["doc"] is None
    assert public["ended"]["message"] == "See you soon"
    await client.put(base, json={"paused": False, "endsAt": "2020-01-01T00:00:00Z"})
    public = (await client.get(f"/api/v1/public/campaigns/{campaign['slug']}")).json()
    assert public["doc"] is None
    await client.put(base, json={"clearEndsAt": True})
    public = (await client.get(f"/api/v1/public/campaigns/{campaign['slug']}")).json()
    assert public["doc"] is not None
    bad = await client.put(base, json={"ended": {"kind": "redirect", "url": "javascript:alert(1)"}})
    assert bad.status_code == 422
    hook = await client.put(base, json={"leadsWebhook": {"url": "http://insecure.example"}})
    assert hook.status_code == 422


async def test_editor_state_round_trip(client):
    campaign = await new_campaign(client)
    resp = await client.put(
        f"/api/v1/campaigns/{campaign['id']}/journey/editor-state",
        json={"dismissedIssues": ["W_ALT:el_x"], "checklist": {"logo": True}},
    )
    assert resp.status_code == 204
    assert (await workspace(client, campaign["id"]))["editorState"]["checklist"] == {"logo": True}


async def test_library_endpoints(client):
    templates = (await client.get("/api/v1/library/templates")).json()["items"]
    assert {t["id"] for t in templates} >= {"lead-gen-launch", "product-quiz", "event-registration", "feedback-nps"}
    assert len((await client.get("/api/v1/library/recipes")).json()["items"]) == 11
    assert len((await client.get("/api/v1/library/presets")).json()["items"]) >= 20
