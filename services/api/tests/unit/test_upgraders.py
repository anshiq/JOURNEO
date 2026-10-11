import json
import os
import pathlib

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from app.modules.journeys.domain.ports import next_producers
from app.modules.journeys.domain.schema.doc import JourneyDoc
from app.modules.journeys.domain.validate import blocking, validate
from app.modules.journeys.upgraders.v3_elements import invert_overrides
from app.modules.journeys.upgraders.v3_to_v4 import ensure_current, v3_to_v4

FIXTURES = pathlib.Path(__file__).resolve().parents[4] / "contracts" / "fixtures" / "docs"
V3 = sorted((FIXTURES / "v3").glob("*.json"))
SNAPSHOTS = FIXTURES / "v4" / "migrated"
UPDATE = os.environ.get("UPDATE_SNAPSHOTS") == "1"
EXPECTED_ERRORS = {
    "advance_auto": {"E_REQUIRED"},
    "condition_branches": {"J_RULE"},
    "pathology_cycle": {"J_LOGIC_LOOP"},
    **{f"operator_{op}": {"J_RULE"} for op in ("contains", "eq", "gt", "gte", "lt", "lte", "neq")},
}


def test_fixture_corpus_is_large_enough():
    assert len(V3) >= 30


@pytest.mark.parametrize("path", V3, ids=[p.stem for p in V3])
def test_v3_fixture_converts(path: pathlib.Path):
    raw = json.loads(path.read_text())
    doc, _ = ensure_current(raw)
    parsed = JourneyDoc.model_validate(doc)
    errors = {i.code for i in blocking(validate(parsed))}
    assert errors == EXPECTED_ERRORS.get(path.stem, set())
    again, _ = ensure_current(json.loads(path.read_text()))
    assert again == doc
    snapshot = SNAPSHOTS / path.name
    if UPDATE or not snapshot.exists():
        snapshot.parent.mkdir(parents=True, exist_ok=True)
        snapshot.write_text(json.dumps(doc, indent=2, sort_keys=True) + "\n")
    assert json.loads(snapshot.read_text()) == doc


def test_seed_journeys_keep_their_exit():
    for path in V3:
        if not path.stem.startswith("seed_"):
            continue
        doc, _ = ensure_current(json.loads(path.read_text()))
        screen = next(iter(doc["screens"].values()))
        assert screen["layout"]["preset"] == "split"
        redirect = next(s["id"] for s in doc["steps"] if s["kind"] == "redirect")
        assert doc["links"][screen["id"]]["next"] == redirect
        assert next_producers(JourneyDoc.model_validate(doc).screens[screen["id"]])


def test_condition_routes_are_carried_over():
    raw = json.loads((FIXTURES / "v3" / "condition_branches.json").read_text())
    raw["nodes"].append(
        {
            "id": "q1",
            "type": "quiz",
            "config": {
                "blockKey": "budget",
                "question": "Budget?",
                "options": [{"id": "h", "label": "high"}, {"id": "l", "label": "low"}],
            },
        }
    )
    raw["screens"][0]["blocks"].append("q1")
    doc, _ = ensure_current(raw)
    condition = next(s for s in doc["steps"] if s["kind"] == "condition")
    assert [r["when"]["op"] for r in condition["rules"]] == ["anyOf", "anyOf"]
    ports = doc["links"][condition["id"]]
    assert set(ports) == {f"rule:{r['id']}" for r in condition["rules"]} | {"else"}
    assert not blocking(validate(JourneyDoc.model_validate(doc)))


def test_unknown_input_is_replaced_not_raised():
    for raw in (None, {}, [], {"schemaVersion": 99}, {"schemaVersion": 3, "nodes": "bad", "screens": 7}):
        doc, issues = ensure_current(raw)
        JourneyDoc.model_validate(doc)
        assert issues


node_types = st.sampled_from(
    [
        "text",
        "image",
        "video",
        "button",
        "quiz",
        "select",
        "input",
        "checkbox",
        "rating",
        "card",
        "hero_section",
        "countdown",
        "weird",
    ]
)
handles = st.sampled_from([None, "default", "b0:answered", "b1:skipped", "b2:default", "zzz", "else", "true"])


@st.composite
def v3_graphs(draw):
    count = draw(st.integers(min_value=0, max_value=5))
    nodes = [{"id": "trigger", "type": "trigger", "config": {}}] if draw(st.booleans()) else []
    for i in range(count):
        nodes.append(
            {
                "id": f"b{i}",
                "type": draw(node_types),
                "config": draw(
                    st.dictionaries(
                        st.sampled_from(["content", "label", "blockKey", "question", "options", "url", "src"]),
                        st.one_of(st.text(max_size=12), st.integers(), st.none()),
                        max_size=4,
                    )
                ),
            }
        )
    nodes.append(
        {
            "id": "end",
            "type": "end",
            "config": draw(st.sampled_from([{}, {"redirectUrl": "https://example.com"}, {"message": "Bye"}])),
        }
    )
    if draw(st.booleans()):
        nodes.append(
            {
                "id": "c1",
                "type": "condition",
                "config": {"field": "x", "branches": [{"handle": "yes", "operator": "eq", "value": 1}]},
            }
        )
    screens = [
        {
            "id": f"s{i}",
            "blocks": draw(st.lists(st.sampled_from([f"b{j}" for j in range(count)] + ["missing"]), max_size=3))
            if count
            else [],
            "advance": {"mode": draw(st.sampled_from(["button", "auto", "none", "block"]))},
        }
        for i in range(draw(st.integers(min_value=0, max_value=3)))
    ]
    targets = [s["id"] for s in screens] + ["end", "c1", "trigger", "ghost"]
    sources = [s["id"] for s in screens] + ["trigger", "c1"]
    edges = [
        {
            "source": draw(st.sampled_from(sources)),
            "target": draw(st.sampled_from(targets)),
            "sourceHandle": draw(handles),
        }
        for _ in range(draw(st.integers(min_value=0, max_value=6)))
    ]
    return {
        "schemaVersion": 3,
        "nodes": nodes,
        "screens": screens,
        "edges": edges,
        "theme": {"primary": draw(st.sampled_from(["#123456", "red", 7]))},
    }


@settings(max_examples=150, deadline=None)
@given(v3_graphs())
def test_converter_is_total(raw):
    doc, _ = v3_to_v4(raw)
    JourneyDoc.model_validate(doc)


def resolve_v3(cfg: dict, responsive: dict, device: str) -> dict:
    return {**cfg, **(responsive.get(device) or {})}


def resolve_v4(base: dict, tablet: dict, desktop: dict, device: str) -> dict:
    if device == "mobile":
        return base
    t = {**base, **tablet}
    return t if device == "tablet" else {**t, **desktop}


values = st.one_of(st.none(), st.sampled_from(["left", "center", "right"]))


@settings(max_examples=200, deadline=None)
@given(
    st.dictionaries(st.sampled_from(["align", "size"]), st.sampled_from(["left", "center", "right"])),
    st.dictionaries(
        st.sampled_from(["mobile", "tablet", "desktop"]),
        st.dictionaries(st.sampled_from(["align", "size"]), st.sampled_from(["left", "center", "right"])),
    ),
)
def test_override_inversion_preserves_every_device(cfg, responsive):
    keys = ["align", "size"]
    base, tablet, desktop = invert_overrides(cfg, responsive, keys)
    for device in ("mobile", "tablet", "desktop"):
        expected = {k: v for k, v in resolve_v3(cfg, responsive, device).items() if k in keys and v is not None}
        actual = {k: v for k, v in resolve_v4(base, tablet, desktop, device).items() if v is not None}
        assert actual == expected, device
