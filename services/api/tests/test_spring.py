from app.sessions import spring as S


def test_pick_journey_none_when_missing():
    assert S.pick_journey(None, "test") is None


def test_pick_journey_test_mode_returns_draft():
    j = {"id": "j1", "status": "DRAFT"}
    assert S.pick_journey(j, "test") == j


def test_pick_journey_live_mode_requires_published():
    j = {"id": "j1", "status": "DRAFT"}
    assert S.pick_journey(j, "live") is None


def test_pick_journey_live_mode_accepts_published():
    j = {"id": "j1", "status": "PUBLISHED"}
    assert S.pick_journey(j, "live") == j


def test_pick_journey_id_mismatch_returns_none():
    j = {"id": "j1", "status": "PUBLISHED"}
    assert S.pick_journey(j, "test", journey_id="other") is None


def test_pick_journey_id_match_returns_journey():
    j = {"id": "j1", "status": "PUBLISHED"}
    assert S.pick_journey(j, "test", journey_id="j1") == j
