from tests.integration.helpers import live_campaign, new_campaign, workspace


async def test_create_list_and_get(client):
    created = await new_campaign(client, brief="Launch of our new running shoe for city runners", goal="leads")
    assert created["slug"] == "spring-launch"
    assert created["publicUrl"] == "https://journeo.test/c/spring-launch"
    listing = (await client.get("/api/v1/campaigns")).json()
    item = next(i for i in listing["items"] if i["id"] == created["id"])
    assert item["status"] == "draft"
    assert item["views"] == 0
    detail = (await client.get(f"/api/v1/campaigns/{created['id']}")).json()
    assert detail["goal"] == "leads"


async def test_auto_name_from_brief(client):
    resp = await client.post("/api/v1/campaigns", json={"brief": "summer giveaway for our coffee club members only"})
    assert resp.json()["campaign"]["name"] == "Summer giveaway for our coffee club"


async def test_create_validates_input_lengths(client):
    resp = await client.post("/api/v1/campaigns", json={"name": "x" * 200})
    assert resp.status_code == 422
    assert resp.headers["content-type"].startswith("application/problem+json")


async def test_slug_change_keeps_old_link_working(client):
    campaign = await live_campaign(client)
    old = campaign["slug"]
    resp = await client.patch(f"/api/v1/campaigns/{campaign['id']}", json={"slug": "new-name"})
    assert resp.status_code == 200
    assert resp.json()["slug"] == "new-name"
    redirect = await client.get(f"/api/v1/public/page/{old}")
    assert redirect.status_code == 301
    assert redirect.headers["location"] == "/c/new-name"
    again = await client.patch(f"/api/v1/campaigns/{campaign['id']}", json={"slug": old})
    assert again.status_code == 200
    other = await new_campaign(client, name="Other")
    taken = await client.patch(f"/api/v1/campaigns/{other['id']}", json={"slug": "new-name"})
    assert taken.status_code == 409
    assert taken.json()["suggestion"].startswith("new-name-")
    invalid = await client.patch(f"/api/v1/campaigns/{other['id']}", json={"slug": "Bad Slug!"})
    assert invalid.status_code == 422


async def test_slug_available(client):
    campaign = await new_campaign(client)
    other = await new_campaign(client, name="Taken")
    resp = await client.get(f"/api/v1/campaigns/{campaign['id']}/slug-available", params={"slug": other["slug"]})
    body = resp.json()
    assert body["available"] is False
    assert body["suggestion"] == "taken-2"


async def test_delete_stops_serving(client):
    campaign = await live_campaign(client)
    assert (await client.get(f"/api/v1/public/campaigns/{campaign['slug']}")).json()["doc"] is not None
    assert (await client.delete(f"/api/v1/campaigns/{campaign['id']}")).status_code == 204
    public = (await client.get(f"/api/v1/public/campaigns/{campaign['slug']}")).json()
    assert public["doc"] is None
    assert (await client.get(f"/api/v1/campaigns/{campaign['id']}")).status_code == 404


async def test_duplicate_copies_draft_only(client):
    campaign = await live_campaign(client)
    resp = await client.post(f"/api/v1/campaigns/{campaign['id']}/duplicate")
    copy = resp.json()["campaign"]
    assert copy["name"] == "Copy of Spring launch"
    ws = await workspace(client, copy["id"])
    assert ws["status"] == "draft"
    assert "scr_thanks" in ws["draft"]["doc"]["screens"]


async def test_save_as_template(client):
    campaign = await live_campaign(client)
    resp = await client.post(f"/api/v1/campaigns/{campaign['id']}/save-as-template", json={"name": "My lead flow"})
    template_id = resp.json()["templateId"]
    templates = (await client.get("/api/v1/library/templates")).json()["items"]
    assert any(t["id"] == template_id and t["source"] == "mine" for t in templates)
    started = await new_campaign(client, name="From mine", start={"mode": "template", "templateId": template_id})
    assert "scr_thanks" in (await workspace(client, started["id"]))["draft"]["doc"]["screens"]


async def test_editor_token_guard(app, client, settings):
    from pydantic import SecretStr

    app.state.settings = settings.model_copy(update={"editor_token": SecretStr("s3cret")})
    assert (await client.get("/api/v1/campaigns")).status_code == 401
    assert (await client.get("/api/v1/campaigns", headers={"Authorization": "Bearer nope"})).status_code == 401
    assert (await client.get("/api/v1/campaigns", headers={"Authorization": "Bearer s3cret"})).status_code == 200
    assert (await client.get("/health")).status_code == 200
