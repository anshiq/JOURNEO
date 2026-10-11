import datetime

import pytest
from pydantic import ValidationError

from app.modules.journeys.domain.rules.model import ValidationContext
from app.modules.journeys.domain.schema.doc import JourneyDoc
from app.modules.journeys.domain.validate import validate
from tests.factories import DocBuilder, buttons, choice, field, form, heading, lead_doc, next_button, text


def codes(doc: dict, ctx: ValidationContext | None = None) -> set[str]:
    return {i.code for i in validate(JourneyDoc.model_validate(doc), ctx)}


def issues_for(doc: dict, code: str):
    return [i for i in validate(JourneyDoc.model_validate(doc)) if i.code == code]


def test_lead_doc_is_clean():
    assert {i.code for i in validate(JourneyDoc.model_validate(lead_doc())) if i.severity == "error"} == set()


def test_entry_required():
    doc = DocBuilder().screen("scr_only01", heading("el_h00001")).build()
    doc["links"] = {}
    assert "J_ENTRY" in codes(doc)
    assert "J_ENTRY" not in codes(DocBuilder().screen("scr_only01", heading("el_h00001")).build())


def test_item_without_link_falls_back_to_next():
    doc = (
        DocBuilder()
        .screen(
            "scr_first1",
            buttons(
                "el_btns01", ("it_goto001", "Offer", {"kind": "goto"}), ("it_next001", "Continue", {"kind": "next"})
            ),
        )
        .screen("scr_second", heading("el_h00002"))
        .chain("scr_first1", "scr_second")
        .build()
    )
    assert "J_EXIT_OPEN" not in codes(doc)


def test_open_exit_targets_each_unlinked_item():
    doc = (
        DocBuilder()
        .screen(
            "scr_first1",
            buttons(
                "el_btns01", ("it_goto001", "Offer A", {"kind": "goto"}), ("it_goto002", "Offer B", {"kind": "goto"})
            ),
        )
        .screen("scr_second", heading("el_h00002"))
        .link("scr_first1", "el_btns01:it_goto001", "scr_second")
        .build()
    )
    found = issues_for(doc, "J_EXIT_OPEN")
    assert [(i.target.kind, i.target.item_id) for i in found] == [("item", "it_goto002")]


def test_all_branch_ports_linked_without_next_is_valid():
    doc = (
        DocBuilder()
        .screen(
            "scr_quiz01",
            choice("el_choice1", "budget", [("opt_low001", "Low"), ("opt_high01", "High")], branchByAnswer=True),
        )
        .screen("scr_low001", heading("el_h00002"))
        .screen("scr_high01", heading("el_h00003"))
        .link("scr_quiz01", "el_choice1:opt:opt_low001", "scr_low001")
        .link("scr_quiz01", "el_choice1:opt:opt_high01", "scr_high01")
        .build()
    )
    assert "J_EXIT_OPEN" not in codes(doc)


def test_dead_continue_button_is_open_exit():
    doc = DocBuilder().screen("scr_first1", next_button("el_btn001", "it_next001")).build()
    found = issues_for(doc, "J_EXIT_OPEN")
    assert found
    assert found[0].target.item_id == "it_next001"


def test_terminal_screen_is_not_open():
    assert "J_EXIT_OPEN" not in codes(DocBuilder().screen("scr_end001", heading("el_h00001")).build())


def test_unreachable_warning():
    doc = DocBuilder().screen("scr_first1", heading("el_h00001")).screen("scr_orphan", heading("el_h00002")).build()
    found = issues_for(doc, "J_UNREACHABLE")
    assert [i.target.id for i in found] == ["scr_orphan"]
    assert found[0].severity == "warning"


def condition(cid: str, rules: list[dict]) -> dict:
    return {"id": cid, "kind": "condition", "rules": rules}


def test_condition_loop_without_screen():
    doc = (
        DocBuilder()
        .screen("scr_first1", next_button("el_btn001", "it_next001"))
        .step(condition("stp_cond01", []))
        .step(condition("stp_cond02", []))
        .link("scr_first1", "next", "stp_cond01")
        .link("stp_cond01", "else", "stp_cond02")
        .link("stp_cond02", "else", "stp_cond01")
        .build()
    )
    assert "J_LOGIC_LOOP" in codes(doc)


def test_screen_cycle_without_exit_is_loop():
    doc = (
        DocBuilder()
        .screen("scr_first1", next_button("el_btn001", "it_next001"))
        .screen("scr_second", next_button("el_btn002", "it_next002"))
        .chain("scr_first1", "scr_second", "scr_first1")
        .build()
    )
    assert "J_LOGIC_LOOP" in codes(doc)


def test_screen_cycle_with_exit_is_fine():
    doc = (
        DocBuilder()
        .screen(
            "scr_first1",
            buttons("el_btns01", ("it_again01", "Again", {"kind": "goto"}), ("it_done001", "Done", {"kind": "next"})),
        )
        .screen("scr_end001", heading("el_h00001"))
        .link("scr_first1", "el_btns01:it_again01", "scr_first1")
        .link("scr_first1", "next", "scr_end001")
        .build()
    )
    assert "J_LOGIC_LOOP" not in codes(doc)


def quiz_with_rule(when: dict, answered_first: bool = True) -> dict:
    builder = DocBuilder()
    question = choice("el_choice1", "budget", [("opt_low001", "Low"), ("opt_high01", "High")], autoAdvance=True)
    if answered_first:
        builder.screen("scr_quiz01", question)
    else:
        builder.screen("scr_intro1", next_button("el_btn000", "it_next000"))
    builder.step(condition("stp_cond01", [{"id": "rule_high01", "label": "High", "when": when}]))
    builder.screen("scr_high01", heading("el_h00002")).screen("scr_other1", heading("el_h00003"))
    first = "scr_quiz01" if answered_first else "scr_intro1"
    builder.link(first, "next", "stp_cond01").link("stp_cond01", "rule:rule_high01", "scr_high01")
    builder.link("stp_cond01", "else", "scr_other1")
    if not answered_first:
        builder.screen("scr_quiz01", question).link("scr_other1", "next", "scr_quiz01")
    return builder.build()


def test_rule_on_answered_question_is_valid():
    assert {"J_RULE", "W_ANSWER_MAYBE"}.isdisjoint(
        codes(quiz_with_rule({"op": "anyOf", "answer": "budget", "value": ["opt_high01"]}))
    )


def test_rule_with_unknown_option():
    assert "J_RULE" in codes(quiz_with_rule({"op": "anyOf", "answer": "budget", "value": ["opt_gone01"]}))


def test_rule_with_wrong_operator():
    assert "J_RULE" in codes(quiz_with_rule({"op": "gt", "answer": "budget", "value": 3}))


def test_rule_on_unknown_answer():
    assert "J_RULE" in codes(quiz_with_rule({"op": "equals", "answer": "nothing", "value": "x"}))


def test_rule_before_answer_is_error():
    doc = quiz_with_rule({"op": "anyOf", "answer": "budget", "value": ["opt_high01"]}, answered_first=False)
    assert "J_RULE" in codes(doc)


def test_answer_maybe_when_only_some_paths_answer():
    doc = (
        DocBuilder()
        .screen(
            "scr_start1",
            buttons("el_btns01", ("it_skip001", "Skip", {"kind": "goto"}), ("it_next001", "Answer", {"kind": "next"})),
        )
        .screen(
            "scr_quiz01",
            choice("el_choice1", "budget", [("opt_low001", "Low"), ("opt_high01", "High")], autoAdvance=True),
        )
        .step(
            condition(
                "stp_cond01",
                [
                    {
                        "id": "rule_high01",
                        "label": "High",
                        "when": {"op": "anyOf", "answer": "budget", "value": ["opt_high01"]},
                    }
                ],
            )
        )
        .screen("scr_end001", heading("el_h00001"))
        .link("scr_start1", "next", "scr_quiz01")
        .link("scr_start1", "el_btns01:it_skip001", "stp_cond01")
        .link("scr_quiz01", "next", "stp_cond01")
        .link("stp_cond01", "rule:rule_high01", "scr_end001")
        .link("stp_cond01", "else", "scr_end001")
        .build()
    )
    found = codes(doc)
    assert "W_ANSWER_MAYBE" in found
    assert "J_RULE" not in found


def test_personalization_token_maybe():
    doc = DocBuilder().screen("scr_first1", heading("el_h00001", "Hi {{first_name|there}}")).build()
    assert "W_ANSWER_MAYBE" in codes(doc)


@pytest.mark.parametrize(
    ("element", "expected"),
    [
        (heading("el_h00001", "   "), "E_REQUIRED"),
        (text("el_t00001", ""), "E_REQUIRED"),
        ({"id": "el_img001", "type": "image", "props": {"src": ""}}, "E_REQUIRED"),
        ({"id": "el_vid001", "type": "video", "props": {"source": {"kind": "youtube", "url": ""}}}, "E_REQUIRED"),
        (buttons("el_btns01", ("it_url0001", "Open", {"kind": "url", "url": "javascript:alert(1)"})), "E_URL"),
        (buttons("el_btns01", ("it_url0001", "", {"kind": "next"})), "E_REQUIRED"),
        (choice("el_choice1", "pick", [("opt_one001", "One")]), "E_REQUIRED"),
        (
            choice(
                "el_choice1", "pick", [("opt_one001", "One"), ("opt_two001", "Two")], multiple=True, branchByAnswer=True
            ),
            "E_BRANCH_MULTI",
        ),
        (form("el_form01"), "E_REQUIRED"),
        ({"id": "el_cnt001", "type": "countdown", "props": {"deadline": "not a date"}}, "E_REQUIRED"),
        (
            {
                "id": "el_img001",
                "type": "image",
                "props": {"src": "https://example.com/a.png", "alt": "A", "action": {"kind": "url", "url": "ftp://x"}},
            },
            "E_URL",
        ),
    ],
)
def test_content_errors(element: dict, expected: str):
    assert expected in codes(DocBuilder().screen("scr_first1", element).build())


def test_two_forms_on_one_screen():
    doc = (
        DocBuilder()
        .screen(
            "scr_first1",
            form("el_form01", field("fld_a00001", "text", "a")),
            form("el_form02", field("fld_b00001", "text", "b")),
        )
        .build()
    )
    assert "E_FORM_MULTI" in codes(doc)


def test_redirect_url_validated():
    doc = (
        DocBuilder()
        .screen("scr_first1", next_button("el_btn001", "it_next001"))
        .step({"id": "stp_redir1", "kind": "redirect", "url": "not-a-url"})
        .link("scr_first1", "next", "stp_redir1")
        .build()
    )
    assert "E_URL" in codes(doc)


def test_answer_keys():
    doc = (
        DocBuilder()
        .screen(
            "scr_first1", form("el_form01", field("fld_a00001", "text", "score"), field("fld_b00001", "text", "email"))
        )
        .build()
    )
    assert "E_KEY_RESERVED" in codes(doc)
    doc = (
        DocBuilder()
        .screen(
            "scr_first1", form("el_form01", field("fld_a00001", "text", "email"), field("fld_b00001", "email", "email"))
        )
        .build()
    )
    assert "E_KEY_CONFLICT" in codes(doc)


def test_consent_and_alt_warnings():
    doc = (
        DocBuilder()
        .screen(
            "scr_first1",
            {"id": "el_img001", "type": "image", "props": {"src": "https://example.com/a.png"}},
            form("el_form01", field("fld_a00001", "email", "email")),
        )
        .build()
    )
    found = codes(doc)
    assert {"W_ALT", "W_CONSENT"} <= found


def test_contrast_warning():
    doc = (
        DocBuilder()
        .screen("scr_first1", heading("el_h00001"))
        .with_(theme={"colors": {"text": "#eeeeee", "background": "#ffffff"}})
        .build()
    )
    assert "W_CONTRAST" in codes(doc)


def test_countdown_past_uses_context_clock():
    doc = (
        DocBuilder()
        .screen("scr_first1", {"id": "el_cnt001", "type": "countdown", "props": {"deadline": "2020-01-01T00:00:00Z"}})
        .build()
    )
    assert "W_COUNTDOWN_PAST" not in codes(doc)
    now = datetime.datetime(2026, 1, 1, tzinfo=datetime.UTC)
    assert "W_COUNTDOWN_PAST" in codes(doc, ValidationContext(now=now))


def test_chat_sources_only_when_not_ready():
    doc = DocBuilder().screen("scr_first1", heading("el_h00001")).with_(assistant={"greeting": "Hi"}).build()
    assert "W_CHAT_SOURCES" not in codes(doc)
    assert "W_CHAT_SOURCES" in codes(doc, ValidationContext(chat_ready=False))
    assert "W_CHAT_SOURCES" not in codes(doc, ValidationContext(chat_ready=True))


def test_seo_image_uses_first_screen_in_journey_order():
    doc = (
        DocBuilder()
        .screen("scr_first1", heading("el_h00001"), next_button("el_btn001", "it_next001"))
        .screen(
            "scr_second",
            {"id": "el_img001", "type": "image", "props": {"src": "https://example.com/a.png", "alt": "A"}},
        )
        .chain("scr_first1", "scr_second")
        .build()
    )
    doc["settings"] = {}
    assert "W_SEO_IMAGE" in codes(doc)


def test_empty_screen_warning():
    assert "W_EMPTY_SCREEN" in codes(DocBuilder().screen("scr_first1").build())


@pytest.mark.parametrize(
    "mutate",
    [
        lambda d: d["steps"].append({"id": "stp_start9", "kind": "start"}),
        lambda d: d["steps"].pop(),
        lambda d: d["links"].update({"scr_thanks": {"next": "scr_missing"}}),
        lambda d: d["screens"]["scr_thanks"]["elements"].append(
            {"id": "el_head01", "type": "heading", "props": {"text": "x"}}
        ),
        lambda d: d["screens"]["scr_thanks"].update(
            {"elements": [{"id": "BAD ID", "type": "heading", "props": {"text": "x"}}]}
        ),
        lambda d: d["theme"].update({"colors": {"primary": "red; background:url(x)"}}),
        lambda d: d["links"].update({"scr_thanks": {"next": "stp_start0"}}),
    ],
)
def test_structural_invariants(mutate):
    doc = lead_doc()
    mutate(doc)
    with pytest.raises(ValidationError):
        JourneyDoc.model_validate(doc)


def test_issues_sorted_errors_first_in_journey_order():
    doc = (
        DocBuilder()
        .screen("scr_first1", heading("el_h00001", ""), next_button("el_btn001", "it_next001"))
        .screen("scr_second", {"id": "el_img001", "type": "image", "props": {"src": ""}})
        .chain("scr_first1", "scr_second")
        .build()
    )
    issues = validate(JourneyDoc.model_validate(doc))
    errors = [i for i in issues if i.severity == "error"]
    assert [i.target.screen_id for i in errors][:2] == ["scr_first1", "scr_second"]
    assert issues.index(errors[-1]) < len(errors)
