import sentry_sdk

from app.core.config import Settings
from app.main import create_app


def test_sentry_stays_off_without_dsn(monkeypatch) -> None:
    calls: list[dict] = []
    monkeypatch.setattr(sentry_sdk, "init", lambda **kwargs: calls.append(kwargs))
    create_app(Settings())
    assert calls == []


def test_sentry_initialises_without_pii_or_traces(monkeypatch) -> None:
    calls: list[dict] = []
    monkeypatch.setattr(sentry_sdk, "init", lambda **kwargs: calls.append(kwargs))
    create_app(Settings(sentry_dsn="https://public@example.invalid/1"))
    assert len(calls) == 1
    assert calls[0]["dsn"] == "https://public@example.invalid/1"
    assert calls[0]["send_default_pii"] is False
    assert calls[0]["traces_sample_rate"] == 0.0
