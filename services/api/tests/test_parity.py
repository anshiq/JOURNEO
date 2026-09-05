import os

os.environ["DATABASE_URL"] = "sqlite:///./test_parity.db"
import json

from fastapi.testclient import TestClient

from app.db.session import Base, SessionLocal, engine
from app.main import app

client = TestClient(app)
def setup_module():
    try:
        os.remove("./test_parity.db")
    except Exception:
        pass
    Base.metadata.create_all(bind=engine)
def test_campaign_crud_and_journey():
    r = client.post("/api/campaigns", json={"name": "T", "description": "d"})
    assert r.status_code == 200
    cid = r.json()["id"]
    assert r.json()["devToken"]
    r = client.get("/api/campaigns")
    assert any(c["id"] == cid for c in r.json())
    r = client.put(f"/api/campaigns/{cid}", json={"name": "T2"})
    assert r.json()["name"] == "T2"
    g = {"schemaVersion": 3, "theme": {}, "nodes": [{"id": "trigger", "type": "trigger", "config": {}}, {"id": "b1", "type": "text", "config": {}}], "screens": [{"id": "s1", "blocks": ["b1"], "advance": {"mode": "button"}}], "edges": [{"id": "e1", "source": "trigger", "target": "s1", "sourceHandle": "default"}, {"id": "e2", "source": "s1", "target": "trigger", "sourceHandle": "default"}]}
    r = client.put(f"/api/campaigns/{cid}/journey", json={"graph": g})
    assert r.status_code == 200, r.text
    jid = r.json()["id"]
    r = client.post(f"/api/campaigns/{cid}/journey/validate", json={"graph": g})
    assert r.status_code == 200
    assert "valid" in r.json()
    r = client.get(f"/api/campaigns/{cid}/journey/graph-version")
    assert r.json()["journeyId"] == jid
    r = client.post(f"/api/campaigns/{cid}/journey/validate-field", json={"fieldKey": "email", "value": "a@b.c"})
    assert r.json() == {"unique": True}
    r = client.post(f"/api/campaigns/{cid}/journey/validate-field", json={"fieldKey": "email", "value": "a@b.c"})
    assert r.json() == {"unique": False}
    r = client.get(f"/api/campaigns/{cid}/dev-link")
    assert "devToken" in r.json()
    tok = r.json()["devToken"]
    r = client.get(f"/api/campaigns/dev/{tok}")
    assert r.json()["id"] == cid
    r = client.post(f"/api/campaigns/{cid}/dev-link/rotate")
    assert r.json()["devToken"] != tok
    r = client.post("/journey-engine/events/ai-actions", json={"campaignId": cid, "type": "t"})
    assert r.json() == {"ok": True}
    r = client.get(f"/api/campaigns/{cid}/activity")
    assert len(r.json()) >= 1
    r = client.get("/api/trace/xxx")
    assert r.json()["requestId"] == "xxx"
def test_style_only_diff():
    from app.modules.journeys.graph import is_style_only_diff
    a = json.dumps({"schemaVersion": 3, "theme": {"primary": "red"}, "nodes": [{"id": "b1", "type": "text", "config": {"style": {"x": 1}}}], "screens": [{"id": "s1", "style": {}, "blocks": []}], "edges": []})
    b = json.dumps({"schemaVersion": 3, "theme": {"primary": "blue"}, "nodes": [{"id": "b1", "type": "text", "config": {"style": {"x": 2}}}], "screens": [{"id": "s1", "style": {}, "blocks": []}], "edges": []})
    assert is_style_only_diff(a, b) is True
    c = json.dumps({"schemaVersion": 3, "theme": {}, "nodes": [{"id": "b1", "type": "text", "config": {"content": "changed"}}], "screens": [{"id": "s1", "blocks": []}], "edges": []})
    assert is_style_only_diff(a, c) is False
def test_analytics_and_connectors():
    r = client.post("/api/campaigns", json={"name": "A"})
    cid = r.json()["id"]
    r = client.get(f"/api/analytics/campaigns/{cid}/reach")
    assert r.json()["campaignId"] == cid
    r = client.get(f"/api/analytics/campaigns/{cid}/metrics")
    assert "totals" in r.json()
    r = client.post("/api/analytics/click", json={"campaignId": cid, "eventName": "view"})
    assert r.status_code == 200
    r = client.post("/api/analytics/llm-usage", json={"requestId": "r1", "campaignId": cid, "agentType": "opt", "model": "m", "promptTokens": 10, "completionTokens": 5, "costUsd": 0.01})
    assert r.status_code == 200
    r = client.get(f"/api/analytics/llm-cost?campaignId={cid}")
    assert r.json()["count"] >= 1
    r = client.get("/catalog/metrics/definitions")
    assert isinstance(r.json(), list)
    r = client.get(f"/catalog/metrics/{cid}")
    assert r.json()["campaign_id"] == cid
    r = client.post("/mock/meta/campaigns", json={"name": "M", "daily_budget": 50})
    assert r.json()["mocked"] is True
    r = client.post("/mock/meta/campaigns/some-internal-id/pause", json={})
    assert r.json()["status"] == "PAUSED"
    r = client.post("/mock/google/campaigns", json={"campaignName": "G", "daily_budget": 60})
    gid = r.json()["resourceName"]
    r = client.post("/mock/google/campaigns/some-internal-id/pause")
    assert r.json()["status"] == "PAUSED"
    db = SessionLocal()
    from app.db.models.connectors import MockCampaign
    q = db.query(MockCampaign).filter(MockCampaign.external_id == gid).first()
    assert q is not None
    internal_gid = q.id
    db.close()
    r = client.post(f"/mock/google/campaigns/{internal_gid}/pause")
    assert r.json()["status"] == "PAUSED"
    db = SessionLocal()
    q2 = db.query(MockCampaign).filter(MockCampaign.id == internal_gid).first()
    assert q2 is not None and q2.status == "PAUSED"
    db.close()
    r = client.post("/mock/whatsapp/broadcasts", json={"templateName": "hello"})
    assert r.json()["status"] == "SENT"
    r = client.get("/mock/meta/campaigns/no-such-id")
    assert r.json()["mocked"] is True
    r = client.get("/audit-log")
    assert len(r.json()) >= 3
    r = client.post("/mock/meta/budget-reallocate", json={"campaignId": cid})
    assert r.json()["status"] == "reallocated"
def test_files_validation():
    r = client.post("/api/files/presign", json={"filename": "a.txt", "contentType": "text/plain", "size": 10})
    assert r.status_code == 400
    r = client.post("/api/files/presign", json={"filename": "a.png", "contentType": "image/png", "size": 10})
    assert r.status_code == 200
    assert "uploadUrl" in r.json()
    r = client.post("/api/files/presign", json={"filename": "a.png", "contentType": "image/png", "size": 100 * 1024 * 1024})
    assert r.status_code == 400
def test_internal_logs_guarded():
    r = client.get("/internal/logs?requestId=x")
    assert r.status_code == 401
    r = client.get("/internal/logs?requestId=x", headers={"X-Internal-Token": "journeo-internal-token-dev"})
    assert r.status_code == 200
