import time

from hypothesis import given, settings
from hypothesis import strategies as st

from app.modules.journeys.domain.analysis import build_index
from app.modules.journeys.domain.compose import compose
from app.modules.journeys.domain.ids import ID_PATTERN, is_valid_id, random_ids, sequential_ids
from app.modules.journeys.domain.ops import export_slug, instantiate_screen, slugify_key
from app.modules.journeys.domain.ports import ports_of, screen_outputs
from app.modules.journeys.domain.schema.doc import JourneyDoc
from app.modules.journeys.domain.targets import resolve_target
from app.modules.journeys.domain.validate import blocking, validate
from tests.factories import DocBuilder, buttons, choice, heading, lead_doc, next_button


def test_ids():
    gen = sequential_ids()
    assert gen("scr") == "scr_0000000001"
    assert all(is_valid_id(random_ids(k)) for k in ("scr", "stp", "el", "it", "opt", "fld", "band", "rule"))
    assert ID_PATTERN.startswith("^")


def test_slugify_key_folds_accents_and_dedupes():
    keys: set[str] = set()
    assert slugify_key("Café Préféré", keys) == "cafe_prefere"
    assert slugify_key("Café préféré", keys) == "cafe_prefere_2"
    assert slugify_key("Score", keys) == "score_answer"
    assert slugify_key("123 go", keys) == "a_123_go"
    assert export_slug("Über Cool!") == "uber-cool"


def test_ports_and_fallbacks():
    doc = (
        DocBuilder()
        .screen(
            "scr_first1",
            buttons("el_btns01", ("it_goto001", "Offer", {"kind": "goto"}), ("it_next001", "Next", {"kind": "next"})),
            choice("el_choice1", "pick", [("opt_aaa001", "A"), ("opt_bbb001", "B")], branchByAnswer=True, other=True),
        )
        .screen("scr_second", heading("el_h00002"))
        .chain("scr_first1", "scr_second")
        .parsed()
    )
    assert [p.port for p in ports_of(doc, "scr_first1")] == [
        "next",
        "el_btns01:it_goto001",
        "el_choice1:opt:opt_aaa001",
        "el_choice1:opt:opt_bbb001",
        "el_choice1:opt:other",
    ]
    assert resolve_target(doc, "scr_first1", "el_btns01:it_goto001") == "scr_second"
    assert resolve_target(doc, "scr_first1", "unknown:port") is None
    assert ports_of(doc, "scr_second") == []
    assert [o.type for o in screen_outputs(doc.screens["scr_first1"])] == ["choice"]


def test_analysis_progress_distance():
    doc = (
        DocBuilder()
        .screen("scr_aaaaa1", next_button("el_btn001", "it_next001"))
        .screen("scr_bbbbb1", next_button("el_btn002", "it_next002"))
        .screen("scr_ccccc1", heading("el_h00001"))
        .chain("scr_aaaaa1", "scr_bbbbb1", "scr_ccccc1")
        .parsed()
    )
    index = build_index(doc)
    assert index.min_to_end["scr_aaaaa1"] == 3
    assert index.min_to_end["scr_ccccc1"] == 1
    assert not index.has_reachable_cycle
    assert index.first_screen() == "scr_aaaaa1"


def test_compose_builds_valid_branching_doc():
    spec = {
        "screens": [
            {"title": "Welcome", "elements": [{"type": "heading", "props": {"text": "Hi"}}]},
            {
                "title": "Budget",
                "elements": [
                    {
                        "type": "choice",
                        "props": {
                            "question": "Budget?",
                            "options": [{"label": "Low"}, {"label": "High"}],
                            "autoAdvance": True,
                        },
                    }
                ],
            },
            {"title": "Basic offer", "elements": [{"type": "heading", "props": {"text": "Basic"}}], "ends": True},
            {"title": "Premium offer", "elements": [{"type": "heading", "props": {"text": "Premium"}}], "ends": True},
        ],
        "branches": [{"after": "Budget", "answer": "budget", "value": "High", "to": "Premium offer"}],
    }
    doc = compose(spec)
    assert compose(spec) == doc
    parsed = JourneyDoc.model_validate(doc)
    assert blocking(validate(parsed)) == []
    budget = next(s for s in doc["screens"].values() if s["name"] == "Budget")
    assert any(":opt:" in port for port in doc["links"][budget["id"]])


def test_compose_gotos_use_item_ports():
    spec = {
        "screens": [
            {
                "title": "Start",
                "elements": [
                    {
                        "type": "buttons",
                        "props": {
                            "items": [
                                {"label": "See offer", "action": {"kind": "next"}},
                                {"label": "Skip", "action": {"kind": "next"}},
                            ]
                        },
                    }
                ],
            },
            {"title": "Offer", "elements": [{"type": "heading", "props": {"text": "Offer"}}]},
            {"title": "End", "elements": [{"type": "heading", "props": {"text": "End"}}], "ends": True},
        ],
        "gotos": [{"from": "Start", "item": "Skip", "to": "End"}],
    }
    doc = compose(spec)
    start = next(s for s in doc["screens"].values() if s["name"] == "Start")
    ports = doc["links"][start["id"]]
    assert any(p.startswith("el_") and ":it_" in p for p in ports)
    assert blocking(validate(JourneyDoc.model_validate(doc))) == []


def test_instantiate_screen_assigns_ids_and_unique_keys():
    recipe = {
        "name": "Q",
        "elements": [{"type": "choice", "props": {"question": "Size?", "options": [{"label": "S"}, {"label": "M"}]}}],
    }
    keys: set[str] = {"size"}
    screen = instantiate_screen(recipe, sequential_ids(), keys)
    props = screen["elements"][0]["props"]
    assert props["key"] == "size_2"
    assert all(is_valid_id(o["id"]) for o in props["options"])


def test_validation_budget_sixty_steps():
    builder = DocBuilder()
    ids = [f"scr_{i:06d}" for i in range(59)]
    for i, sid in enumerate(ids):
        builder.screen(sid, heading(f"el_h{i:06d}"), next_button(f"el_b{i:06d}", f"it_n{i:06d}"))
    builder.chain(*ids)
    doc = builder.parsed()
    start = time.perf_counter()
    validate(doc)
    assert time.perf_counter() - start < 0.25


@settings(max_examples=40, deadline=None)
@given(st.lists(st.sampled_from(["next", "goto", "terminal"]), min_size=1, max_size=8), st.randoms())
def test_random_graphs_never_crash(kinds, rnd):
    builder = DocBuilder()
    ids = [f"scr_{i:06d}" for i in range(len(kinds))]
    for i, (sid, kind) in enumerate(zip(ids, kinds, strict=True)):
        if kind == "terminal":
            builder.screen(sid, heading(f"el_h{i:06d}"))
        else:
            builder.screen(sid, buttons(f"el_b{i:06d}", (f"it_x{i:06d}", "Go", {"kind": kind})))
    for i, sid in enumerate(ids):
        if kinds[i] != "terminal":
            target = rnd.choice(ids)
            port = "next" if kinds[i] == "next" else f"el_b{i:06d}:it_x{i:06d}"
            builder.link(sid, port, target)
    validate(builder.parsed())


def test_lead_doc_round_trip():
    assert JourneyDoc.model_validate(lead_doc()).model_dump(by_alias=True, exclude_unset=True)["schemaVersion"] == 4
