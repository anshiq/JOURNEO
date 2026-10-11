import pytest
from limits import parse

from app.core.config import Settings
from app.core.http import BlockedDestination, allowed, fetch_text
from app.core.ratelimit import limiter_for


@pytest.mark.parametrize(
    "address", ["127.0.0.1", "10.0.0.5", "169.254.169.254", "192.168.1.1", "::1", "::ffff:127.0.0.1", "fc00::1"]
)
def test_private_addresses_blocked(address: str):
    assert not allowed(address)


def test_public_address_allowed():
    assert allowed("93.184.216.34")


@pytest.mark.parametrize(
    "url", ["http://127.0.0.1/", "http://localhost:8000/", "file:///etc/passwd", "ftp://example.com/x"]
)
async def test_fetch_blocks_internal_targets(url: str):
    with pytest.raises(BlockedDestination):
        await fetch_text(url)


async def test_async_rate_limiter_works():
    limiter = limiter_for("async+memory://")
    item = parse("2/minute")
    assert await limiter.hit(item, "test-key")
    assert await limiter.hit(item, "test-key")
    assert not await limiter.hit(item, "test-key")


def test_legacy_openrouter_env_names(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-legacy")
    monkeypatch.setenv("OPENROUTER_MODEL", "vendor/model-x")
    settings = Settings(_env_file=None)
    assert settings.llm.api_key.get_secret_value() == "sk-legacy"
    assert settings.llm.model == "vendor/model-x"
    assert settings.llm.generation == "vendor/model-x"
    monkeypatch.setenv("LLM__MODEL", "vendor/new")
    assert Settings(_env_file=None).llm.model == "vendor/new"


def test_memory_uri_is_upgraded_to_async():
    assert Settings(_env_file=None, rate_limit_storage_uri="memory://").rate_limit_storage_uri == "async+memory://"


async def test_rate_limit_enforced_on_public_endpoint(app, client, settings):
    app.state.settings = settings.model_copy(
        update={"rate_limit_enabled": True, "rate_limit_storage_uri": "async+memory://"}
    )
    codes = [
        (
            await client.post(
                "/api/v1/public/sessions", json={"id": "00000000-0000-4000-8000-000000000000", "campaignId": "x"}
            )
        ).status_code
        for _ in range(32)
    ]
    assert codes.count(429) >= 1
    assert 500 not in codes


async def test_request_id_is_server_generated(client):
    resp = await client.get("/health", headers={"x-request-id": "evil id\ninjected"})
    assert resp.headers["x-request-id"] != "evil id\ninjected"
    assert len(resp.headers["x-request-id"]) == 12


async def test_unknown_route_is_problem_json(client):
    resp = await client.get("/api/v1/nope")
    assert resp.status_code == 404
    assert resp.headers["content-type"].startswith("application/problem+json")


async def test_test_reset_only_mounted_in_e2e(settings):
    from app.main import create_app

    paths = create_app(settings.model_copy(update={"e2e": False})).openapi()["paths"]
    assert "/api/v1/test/reset" not in paths
