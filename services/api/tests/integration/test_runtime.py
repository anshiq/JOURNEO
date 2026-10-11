import hashlib
import hmac
import json
import re
import uuid

import respx
from httpx import Response
from sqlalchemy import select

from app.modules.leads import service as leads
from app.modules.leads.models import Lead, WebhookDelivery
from app.modules.runtime.models import JourneyEvent, JourneySession
from tests.factories import lead_doc
from tests.integration.helpers import live_campaign, new_campaign, publish, save, workspace


async def start_session(client, campaign, **extra):
    sid = str(uuid.uuid4())
    resp = await client.post(
        "/api/v1/public/sessions",
        json={
            "id": sid,
            "campaignId": campaign["id"],
            "device": "mobile",
            "utm": {"utm_source": "ig", "evil": "x"},
            **extra,
        },
    )
    assert resp.status_code == 200, resp.text
    return sid, resp.json()


async def test_public_payloads_never_expose_tokens(client):
    campaign = await live_campaign(client)
    raw = (await client.get(f"/api/v1/public/campaigns/{campaign['slug']}")).text
    page = (await client.get(f"/api/v1/public/page/{campaign['slug']}")).text
    ws = await workspace(client, campaign["id"])
    token = campaign["previewUrl"].rsplit("/", 1)[1]
    for body in (raw, page):
        assert token not in body
        assert "webhook" not in body.lower()
    assert ws["journeyId"]


async def test_page_has_meta_tags_and_inline_doc(client):
    doc = lead_doc()
    doc["settings"]["seo"] = {
        "title": "Spring <launch>",
        "description": 'Win "big"',
        "image": "/api/v1/files/img_x_1280.webp",
    }
    doc["screens"]["scr_thanks"]["elements"][0]["props"]["text"] = "</script><script>alert(1)</script>"
    campaign = await live_campaign(client, doc)
    resp = await client.get(f"/api/v1/public/page/{campaign['slug']}")
    assert resp.status_code == 200
    html = resp.text
    assert "<title>Spring &lt;launch&gt;</title>" in html
    assert 'property="og:image" content="https://journeo.test/api/v1/files/img_x_1280.webp"' in html
    assert 'rel="canonical" href="https://journeo.test/c/spring-launch"' in html
    assert "<script>alert(1)</script>" not in html
    payload = json.loads(re.search(r'<script id="jx-doc" type="application/json">(.*?)</script>', html).group(1))
    assert payload["doc"]["screens"]["scr_thanks"]["elements"][0]["props"]["text"].startswith("</script>")
    assert 'rel="preload" as="font" type="font/woff2" href="/fonts/inter-latin-wght-normal.woff2"' in html
    assert "Content-Security-Policy" in resp.headers
    etag = resp.headers["etag"]
    cached = await client.get(f"/api/v1/public/page/{campaign['slug']}", headers={"If-None-Match": etag})
    assert cached.status_code == 304


async def test_unknown_page_is_404_html(client):
    resp = await client.get("/api/v1/public/page/does-not-exist")
    assert resp.status_code == 404
    assert 'name="robots" content="noindex"' in resp.text


async def test_unpublished_campaign_shows_ended(client):
    campaign = await new_campaign(client)
    public = (await client.get(f"/api/v1/public/campaigns/{campaign['slug']}")).json()
    assert public["doc"] is None


async def test_dev_link_serves_draft_with_etag(client):
    campaign = await new_campaign(client)
    await save(client, campaign["id"], lead_doc())
    token = campaign["previewUrl"].rsplit("/", 1)[1]
    resp = await client.get(f"/api/v1/public/dev/{token}")
    assert resp.status_code == 200
    assert resp.headers["x-robots-tag"] == "noindex"
    assert "scr_thanks" in resp.json()["doc"]["screens"]
    again = await client.get(f"/api/v1/public/dev/{token}", headers={"If-None-Match": resp.headers["etag"]})
    assert again.status_code == 304
    reset = await client.post(f"/api/v1/campaigns/{campaign['id']}/preview-link/reset")
    assert reset.status_code == 200
    assert (await client.get(f"/api/v1/public/dev/{token}")).status_code == 404


async def test_session_pins_version_and_resumes(client, session):
    campaign = await live_campaign(client)
    sid, body = await start_session(client, campaign)
    v1 = body["versionId"]
    assert v1
    await save(client, campaign["id"], {**lead_doc(), "theme": {"radius": "lg"}})
    await publish(client, campaign["id"])
    again = await client.post(
        "/api/v1/public/sessions", json={"id": sid, "campaignId": campaign["id"], "versionId": v1}
    )
    assert again.json()["versionId"] == v1
    assert again.json()["resumed"] is True
    fresh = await client.post(
        "/api/v1/public/sessions", json={"id": str(uuid.uuid4()), "campaignId": campaign["id"], "versionId": v1}
    )
    assert fresh.json()["versionId"] == v1
    row = await session.get(JourneySession, uuid.UUID(sid))
    assert row.utm == {"utm_source": "ig"}


async def test_session_for_unknown_campaign_is_404(client):
    resp = await client.post("/api/v1/public/sessions", json={"id": str(uuid.uuid4()), "campaignId": "nope"})
    assert resp.status_code == 404


async def test_events_use_server_side_session_data(client, session):
    campaign = await live_campaign(client)
    other = await live_campaign(client)
    sid, _ = await start_session(client, campaign)
    events = [
        {"seq": 1, "type": "screen_view", "step": "scr_welcome", "campaignId": other["id"], "isTest": True},
        {"seq": 2, "type": "answer", "step": "scr_welcome", "payload": {"key": "plan", "value": "opt_a"}},
        {"seq": 2, "type": "answer", "step": "dup"},
        {"seq": 3, "type": "bogus"},
        {"seq": 4, "type": "complete", "step": "scr_thanks"},
    ]
    resp = await client.post(f"/api/v1/public/sessions/{sid}/events", json={"events": events})
    assert resp.status_code == 202
    assert resp.json()["accepted"] == 3
    beacon = await client.post(
        f"/api/v1/public/sessions/{sid}/events",
        content=json.dumps({"events": [{"seq": 5, "type": "exit", "step": "scr_thanks", "port": "next"}]}),
        headers={"content-type": "text/plain"},
    )
    assert beacon.json()["accepted"] == 1
    rows = (
        (await session.execute(select(JourneyEvent).where(JourneyEvent.session_id == uuid.UUID(sid)))).scalars().all()
    )
    assert {r.campaign_id for r in rows} == {campaign["id"]}
    assert not any(r.is_test for r in rows)
    state = await session.get(JourneySession, uuid.UUID(sid))
    await session.refresh(state)
    assert state.completed_at is not None
    assert state.answers["plan"] == "opt_a"
    missing = await client.post(f"/api/v1/public/sessions/{uuid.uuid4()}/events", json={"events": events})
    assert missing.status_code == 404
    huge = await client.post(f"/api/v1/public/sessions/{sid}/events", content=b"x" * 70000)
    assert huge.status_code == 413


async def submit(client, sid, answers, **extra):
    return await client.post(
        f"/api/v1/public/sessions/{sid}/submit",
        json={"stepId": "scr_form01", "elementId": "el_form01", "answers": answers, **extra},
    )


async def test_submit_validates_and_stores_lead(client, session):
    campaign = await live_campaign(client)
    sid, _ = await start_session(client, campaign)
    bad = await submit(client, sid, {"first_name": "", "email": "not-an-email", "consent": False})
    assert bad.status_code == 422
    assert set(bad.json()["fields"]) == {"first_name", "email", "consent"}
    ok = await submit(
        client, sid, {"first_name": "Ana", "email": "Ana@Example.com", "consent": True, "extra": "ignored"}
    )
    assert ok.status_code == 200, ok.text
    lead = await session.get(Lead, ok.json()["leadId"])
    assert lead.campaign_id == campaign["id"]
    assert lead.normalized_email == "ana@example.com"
    assert "extra" not in lead.data["answers"]
    assert lead.data["consent"]["text"] == "I agree"
    sid2, _ = await start_session(client, campaign)
    dupe = await submit(client, sid2, {"first_name": "Ana", "email": "ana@example.com", "consent": True})
    assert dupe.status_code == 409
    assert dupe.json()["fields"] == {"email": "You've already entered"}
    honeypot = await submit(
        client, sid2, {"first_name": "Bot", "email": "bot@example.com", "consent": True}, hp="filled"
    )
    assert honeypot.status_code == 200
    assert "leadId" not in honeypot.json()
    unknown = await client.post(
        f"/api/v1/public/sessions/{sid2}/submit", json={"stepId": "scr_form01", "elementId": "el_nope", "answers": {}}
    )
    assert unknown.status_code == 404


async def test_leads_list_csv_and_pagination(client):
    campaign = await live_campaign(client)
    for i in range(3):
        sid, _ = await start_session(client, campaign)
        resp = await submit(client, sid, {"first_name": f"=cmd{i}", "email": f"user{i}@example.com", "consent": True})
        assert resp.status_code == 200
    page = (await client.get(f"/api/v1/campaigns/{campaign['id']}/leads", params={"limit": 2})).json()
    assert len(page["items"]) == 2
    rest = (
        await client.get(f"/api/v1/campaigns/{campaign['id']}/leads", params={"limit": 2, "cursor": page["nextCursor"]})
    ).json()
    assert len(rest["items"]) == 1
    assert {i["id"] for i in page["items"]}.isdisjoint({i["id"] for i in rest["items"]})
    csv = (await client.get(f"/api/v1/campaigns/{campaign['id']}/leads.csv")).text
    header, *rows = csv.strip().splitlines()
    assert header == "Submitted at,First name,Email,Consent,utm_source,Consent text,Test"
    assert len(rows) == 3
    assert all(",'=cmd" in r for r in rows)


async def test_test_mode_sessions_and_leads_are_marked(client, session):
    campaign = await new_campaign(client)
    await save(client, campaign["id"], lead_doc())
    token = campaign["previewUrl"].rsplit("/", 1)[1]
    sid, body = await start_session(client, campaign, devToken=token)
    assert body["isTest"] is True
    resp = await submit(client, sid, {"first_name": "Tess", "email": "tess@example.com", "consent": True})
    lead = await session.get(Lead, resp.json()["leadId"])
    assert lead.is_test
    listing = (await client.get(f"/api/v1/campaigns/{campaign['id']}/leads")).json()
    assert listing["items"] == []
    bad = await client.post(
        "/api/v1/public/sessions",
        json={"id": str(uuid.uuid4()), "campaignId": campaign["id"], "devToken": "wrong-token-123"},
    )
    assert bad.status_code == 404


async def test_webhook_is_deferred_signed_and_recorded(client, session, task_queue):
    campaign = await live_campaign(client)
    await client.put(
        f"/api/v1/campaigns/{campaign['id']}/journey/ops",
        json={"leadsWebhook": {"url": "https://hooks.example.com/in"}},
    )
    sid, _ = await start_session(client, campaign)
    resp = await submit(client, sid, {"first_name": "Ana", "email": "ana@example.com", "consent": True})
    lead_id = resp.json()["leadId"]
    jobs = [j for j in task_queue.jobs.values() if j["task_name"] == "leads.deliver_webhook"]
    assert len(jobs) == 1
    assert jobs[0]["args"] == {"lead_id": lead_id}
    with respx.mock(assert_all_called=True) as mock:
        route = mock.post("https://hooks.example.com/in").mock(return_value=Response(200))
        from app.core import http

        original = http.allowed
        http.allowed = lambda address: True
        try:
            delivered = await leads.deliver_lead(session, lead_id, 1)
        finally:
            http.allowed = original
    assert delivered
    request = route.calls[0].request
    secret_row = (await session.execute(select(Lead).where(Lead.id == lead_id))).scalar_one()
    from app.modules.campaigns.models import Campaign

    secret = (await session.get(Campaign, secret_row.campaign_id)).webhook_secret
    expected = "sha256=" + hmac.new(secret.encode(), request.content, hashlib.sha256).hexdigest()
    assert request.headers["X-Journeo-Signature"] == expected
    assert json.loads(request.content)["answers"]["email"] == "ana@example.com"
    deliveries = (await session.execute(select(WebhookDelivery))).scalars().all()
    assert any(d.lead_id == lead_id and d.delivered_at is not None for d in deliveries)


async def test_assist_falls_back_without_sources(client):
    doc = lead_doc()
    doc["assistant"] = {
        "greeting": "Hi",
        "fallback": "Ask our team",
        "fallbackCtaLabel": "Talk to us",
        "fallbackTarget": "scr_form01",
    }
    campaign = await live_campaign(client, doc)
    sid, _ = await start_session(client, campaign)
    resp = await client.post(f"/api/v1/public/sessions/{sid}/assist", json={"question": "What does it cost?"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["fallback"] is True
    assert body["answer"] == "Ask our team"
    assert body["cta"] == {"label": "Talk to us", "target": "scr_form01"}


async def test_results_summary(client):
    campaign = await live_campaign(client)
    sid, _ = await start_session(client, campaign)
    await client.post(
        f"/api/v1/public/sessions/{sid}/events",
        json={
            "events": [
                {"seq": 1, "type": "screen_view", "step": "scr_welcome"},
                {"seq": 2, "type": "complete", "step": "scr_thanks"},
            ]
        },
    )
    results = (await client.get(f"/api/v1/campaigns/{campaign['id']}/results", params={"range": "all"})).json()
    assert results["sessions"] == 1
    assert results["completion"] == 1.0
    assert results["funnel"][0] == {"stepId": "scr_welcome", "label": "Welcome", "visitors": 1, "exits": 0}
    assert results["devices"] == {"mobile": 1}
