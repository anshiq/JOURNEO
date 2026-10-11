import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services" / "api"))

from datetime import datetime

from app.modules.journeys.domain.ports import ports_of, screen_outputs
from app.modules.journeys.domain.rules.model import ValidationContext
from app.modules.journeys.domain.schema.doc import JourneyDoc
from app.modules.journeys.domain.validate import validate

OUT = ROOT / "contracts" / "conformance"
NEXT = {"kind": "next"}
GOTO = {"kind": "goto"}


def heading(eid, text="Hello"):
    return {"id": eid, "type": "heading", "props": {"text": text}}


def buttons(eid, *items):
    return {"id": eid, "type": "buttons", "props": {"items": [{"id": i, "label": label, "action": a} for i, label, a in items]}}


def choice(eid, key, options, **props):
    return {"id": eid, "type": "choice", "props": {"question": "Pick", "key": key, "options": [{"id": i, "label": label, **extra} for i, label, *rest in options for extra in [rest[0] if rest else {}]], **props}}


def rating(eid, key, bands=None, **props):
    p = {"question": "Rate", "key": key, "scale": "nps", "max": 10, **props}
    if bands:
        p["bands"] = [{"id": i, "label": label, "min": lo, "max": hi} for i, label, lo, hi in bands]
        p["branchByScore"] = True
    return {"id": eid, "type": "rating", "props": p}


def form(eid, *fields):
    return {"id": eid, "type": "form", "props": {"fields": [{"id": f, "kind": k, "label": key, "key": key, **x} for f, k, key, *rest in fields for x in [rest[0] if rest else {}]], "submitLabel": "Send"}}


def doc(screens, steps_extra=(), links=None, **extra):
    steps = [{"id": "stp_start0", "kind": "start"}] + [{"id": s["id"], "kind": "screen"} for s in screens] + list(steps_extra)
    d = {"schemaVersion": 4, "theme": {}, "screens": {s["id"]: {"name": s["id"], **s} for s in screens}, "steps": steps,
         "links": {"stp_start0": {"next": screens[0]["id"]}, **(links or {})}, "settings": {"seo": {"image": "https://example.com/s.png"}}}
    d.update(extra)
    return d


def scr(sid, *elements, **extra):
    return {"id": sid, "elements": list(elements), **extra}


cases = {}

cases["linear"] = (doc([scr("scr_aaaaaa", heading("el_h00001"), buttons("el_b00001", ("it_n00001", "Next", NEXT))), scr("scr_bbbbbb", heading("el_h00002"))],
                       links={"scr_aaaaaa": {"next": "scr_bbbbbb"}}),
                   [{"inputs": [{"at": "scr_aaaaaa", "port": "next", "answers": {}}], "path": ["scr_aaaaaa", "scr_bbbbbb"], "status": "ended"}])

cases["goto_fallback"] = (doc([scr("scr_aaaaaa", buttons("el_b00001", ("it_g00001", "Offer", GOTO), ("it_n00001", "Next", NEXT))), scr("scr_bbbbbb", heading("el_h00002")), scr("scr_cccccc", heading("el_h00003"))],
                              links={"scr_aaaaaa": {"next": "scr_bbbbbb"}}),
                          [{"inputs": [{"at": "scr_aaaaaa", "port": "el_b00001:it_g00001", "answers": {}}], "path": ["scr_aaaaaa", "scr_bbbbbb"], "status": "ended"}])

cases["goto_linked"] = (doc([scr("scr_aaaaaa", buttons("el_b00001", ("it_g00001", "Offer", GOTO), ("it_n00001", "Next", NEXT))), scr("scr_bbbbbb", heading("el_h00002")), scr("scr_cccccc", heading("el_h00003"))],
                            links={"scr_aaaaaa": {"next": "scr_bbbbbb", "el_b00001:it_g00001": "scr_cccccc"}}),
                        [{"inputs": [{"at": "scr_aaaaaa", "port": "el_b00001:it_g00001", "answers": {}}], "path": ["scr_aaaaaa", "scr_cccccc"], "status": "ended"}])

cases["branch_by_answer"] = (doc([scr("scr_quiz01", choice("el_c00001", "budget", [("opt_low001", "Low"), ("opt_high01", "High")], branchByAnswer=True, other=True), buttons("el_b00001", ("it_n00001", "Continue", NEXT))),
                                  scr("scr_low001", heading("el_h00002")), scr("scr_high01", heading("el_h00003"))],
                                 links={"scr_quiz01": {"next": "scr_low001", "el_c00001:opt:opt_high01": "scr_high01"}}),
                             [{"inputs": [{"at": "scr_quiz01", "port": "next", "answers": {"budget": "opt_high01"}}], "path": ["scr_quiz01", "scr_high01"], "status": "ended"},
                              {"inputs": [{"at": "scr_quiz01", "port": "next", "answers": {"budget": "opt_low001"}}], "path": ["scr_quiz01", "scr_low001"], "status": "ended"},
                              {"inputs": [{"at": "scr_quiz01", "port": "el_c00001:opt:other", "answers": {"budget": "other"}}], "path": ["scr_quiz01", "scr_low001"], "status": "ended"}])

cases["rating_bands"] = (doc([scr("scr_score1", rating("el_r00001", "nps", [("band_low001", "Low", 0, 6), ("band_high01", "High", 9, 10)]), buttons("el_b00001", ("it_n00001", "Continue", NEXT))),
                              scr("scr_sorry1", heading("el_h00002")), scr("scr_yay001", heading("el_h00003")), scr("scr_thanks", heading("el_h00004"))],
                             links={"scr_score1": {"next": "scr_thanks", "el_r00001:band:band_low001": "scr_sorry1", "el_r00001:band:band_high01": "scr_yay001"}}),
                         [{"inputs": [{"at": "scr_score1", "port": "next", "answers": {"nps": 3}}], "path": ["scr_score1", "scr_sorry1"], "status": "ended"},
                          {"inputs": [{"at": "scr_score1", "port": "next", "answers": {"nps": 8}}], "path": ["scr_score1", "scr_thanks"], "status": "ended"},
                          {"inputs": [{"at": "scr_score1", "port": "next", "answers": {"nps": 10}}], "path": ["scr_score1", "scr_yay001"], "status": "ended"}])

cond = {"id": "stp_cond01", "kind": "condition", "rules": [
    {"id": "rule_vip001", "label": "VIP", "when": {"all": [{"op": "anyOf", "answer": "tier", "value": ["opt_vip001"]}, {"op": "gte", "answer": "score", "value": 5}]}},
    {"id": "rule_mob001", "label": "Mobile", "when": {"op": "is", "answer": "device", "value": "mobile"}}]}
cases["condition_rules"] = (doc([scr("scr_quiz01", choice("el_c00001", "tier", [("opt_vip001", "VIP", {"points": 5}), ("opt_std001", "Standard", {"points": 1})], autoAdvance=True, scoring="points")),
                                 scr("scr_vip001", heading("el_h00002")), scr("scr_mob001", heading("el_h00003")), scr("scr_else01", heading("el_h00004"))],
                                [cond], links={"scr_quiz01": {"next": "stp_cond01"}, "stp_cond01": {"rule:rule_vip001": "scr_vip001", "rule:rule_mob001": "scr_mob001", "else": "scr_else01"}}),
                            [{"system": {"device": "desktop"}, "inputs": [{"at": "scr_quiz01", "port": "next", "answers": {"tier": "opt_vip001"}}], "path": ["scr_quiz01", "scr_vip001"], "status": "ended", "matched": "rule_vip001"},
                             {"system": {"device": "mobile"}, "inputs": [{"at": "scr_quiz01", "port": "next", "answers": {"tier": "opt_std001"}}], "path": ["scr_quiz01", "scr_mob001"], "status": "ended", "matched": "rule_mob001"},
                             {"system": {"device": "desktop"}, "inputs": [{"at": "scr_quiz01", "port": "next", "answers": {"tier": "opt_std001"}}], "path": ["scr_quiz01", "scr_else01"], "status": "ended", "matched": "else"}])

outcome_cond = {"id": "stp_cond01", "kind": "condition", "rules": [
    {"id": "rule_resa01", "label": "A", "when": {"op": "topOutcome", "answer": "outcomes", "value": "scr_resa01"}},
    {"id": "rule_resb01", "label": "B", "when": {"op": "topOutcome", "answer": "outcomes", "value": "scr_resb01"}}]}
cases["top_outcome"] = (doc([scr("scr_q00001", choice("el_c00001", "q1", [("opt_a00001", "A", {"outcome": "scr_resa01"}), ("opt_b00001", "B", {"outcome": "scr_resb01"})], autoAdvance=True, scoring="outcomes")),
                             scr("scr_q00002", choice("el_c00002", "q2", [("opt_a00002", "A", {"outcome": "scr_resa01"}), ("opt_b00002", "B", {"outcome": "scr_resb01"})], autoAdvance=True, scoring="outcomes")),
                             scr("scr_resa01", heading("el_h00002")), scr("scr_resb01", heading("el_h00003"))],
                            [outcome_cond], links={"scr_q00001": {"next": "scr_q00002"}, "scr_q00002": {"next": "stp_cond01"}, "stp_cond01": {"rule:rule_resa01": "scr_resa01", "rule:rule_resb01": "scr_resb01", "else": "scr_resa01"}}),
                        [{"inputs": [{"at": "scr_q00001", "port": "next", "answers": {"q1": "opt_b00001"}}, {"at": "scr_q00002", "port": "next", "answers": {"q2": "opt_b00002"}}], "path": ["scr_q00001", "scr_q00002", "scr_resb01"], "status": "ended"},
                         {"inputs": [{"at": "scr_q00001", "port": "next", "answers": {"q1": "opt_a00001"}}, {"at": "scr_q00002", "port": "next", "answers": {"q2": "opt_b00002"}}], "path": ["scr_q00001", "scr_q00002", "scr_resa01"], "status": "ended"},
                         {"inputs": [{"at": "scr_q00001", "port": "next", "answers": {"q1": "opt_b00001"}}, {"back": True}, {"at": "scr_q00001", "port": "next", "answers": {"q1": "opt_a00001"}}, {"at": "scr_q00002", "port": "next", "answers": {"q2": "opt_a00002"}}], "path": ["scr_q00001", "scr_q00002", "scr_q00001", "scr_q00002", "scr_resa01"], "status": "ended"}])

cases["redirect_with_params"] = (doc([scr("scr_aaaaaa", buttons("el_b00001", ("it_n00001", "Go", NEXT)))],
                                     [{"id": "stp_redir1", "kind": "redirect", "url": "https://example.com/shop?x=1", "passParams": True, "delayMs": 500}],
                                     links={"scr_aaaaaa": {"next": "stp_redir1"}}),
                                 [{"system": {"utm_source": "ig", "param.ref": "abc"}, "inputs": [{"at": "scr_aaaaaa", "port": "next", "answers": {}}], "path": ["scr_aaaaaa"], "status": "redirect", "redirect": "https://example.com/shop?x=1&utm_source=ig&ref=abc"}])

loop_cond = [{"id": "stp_cond01", "kind": "condition", "rules": []}, {"id": "stp_cond02", "kind": "condition", "rules": []}]
cases["condition_loop"] = (doc([scr("scr_aaaaaa", buttons("el_b00001", ("it_n00001", "Go", NEXT)))], loop_cond,
                               links={"scr_aaaaaa": {"next": "stp_cond01"}, "stp_cond01": {"else": "stp_cond02"}, "stp_cond02": {"else": "stp_cond01"}}),
                           [{"inputs": [{"at": "scr_aaaaaa", "port": "next", "answers": {}}], "path": ["scr_aaaaaa"], "status": "ended", "error": "hop_limit"}])

cases["form_exit"] = (doc([scr("scr_form01", form("el_f00001", ("fld_e00001", "email", "email", {"required": True}), ("fld_c00001", "consent", "consent", {"required": True}))), scr("scr_thanks", heading("el_h00002"))],
                          links={"scr_form01": {"next": "scr_thanks"}}),
                      [{"inputs": [{"at": "scr_form01", "port": "next", "answers": {"email": "a@b.co", "consent": True}}], "path": ["scr_form01", "scr_thanks"], "status": "ended"}])

cases["cards_goto"] = (doc([scr("scr_aaaaaa", {"id": "el_k00001", "type": "cards", "props": {"items": [{"id": "it_card001", "title": "One", "button": {"label": "Pick", "action": GOTO}}, {"id": "it_card002", "title": "Two", "button": {"label": "Pick two", "action": NEXT}}]}}),
                            scr("scr_bbbbbb", heading("el_h00002")), scr("scr_cccccc", heading("el_h00003"))],
                           links={"scr_aaaaaa": {"next": "scr_bbbbbb", "el_k00001:it_card001": "scr_cccccc"}}), [])

cases["open_exit"] = (doc([scr("scr_aaaaaa", buttons("el_b00001", ("it_g00001", "Offer", GOTO), ("it_g00002", "Other", GOTO))), scr("scr_bbbbbb", heading("el_h00002"))],
                          links={"scr_aaaaaa": {"el_b00001:it_g00001": "scr_bbbbbb"}}), [])
cases["dead_next"] = (doc([scr("scr_aaaaaa", buttons("el_b00001", ("it_n00001", "Continue", NEXT)))]), [])
cases["unreachable"] = (doc([scr("scr_aaaaaa", heading("el_h00001")), scr("scr_orphan", heading("el_h00002"))]), [])
cases["no_entry"] = (lambda d: (d.update({"links": {}}), d)[1])(doc([scr("scr_aaaaaa", heading("el_h00001"))])), []
cases["screen_cycle"] = (doc([scr("scr_aaaaaa", buttons("el_b00001", ("it_n00001", "Go", NEXT))), scr("scr_bbbbbb", buttons("el_b00002", ("it_n00002", "Back", NEXT)))],
                             links={"scr_aaaaaa": {"next": "scr_bbbbbb"}, "scr_bbbbbb": {"next": "scr_aaaaaa"}}), [])
cases["rule_before_answer"] = (doc([scr("scr_aaaaaa", buttons("el_b00001", ("it_n00001", "Go", NEXT))), scr("scr_quiz01", choice("el_c00001", "budget", [("opt_low001", "Low"), ("opt_high01", "High")], autoAdvance=True)), scr("scr_end001", heading("el_h00003"))],
                                   [{"id": "stp_cond01", "kind": "condition", "rules": [{"id": "rule_high01", "label": "High", "when": {"op": "anyOf", "answer": "budget", "value": ["opt_high01"]}}]}],
                                   links={"scr_aaaaaa": {"next": "stp_cond01"}, "stp_cond01": {"rule:rule_high01": "scr_quiz01", "else": "scr_quiz01"}, "scr_quiz01": {"next": "scr_end001"}}), [])
cases["rule_bad_operator"] = (doc([scr("scr_quiz01", choice("el_c00001", "budget", [("opt_low001", "Low"), ("opt_high01", "High")], autoAdvance=True)), scr("scr_end001", heading("el_h00003"))],
                                  [{"id": "stp_cond01", "kind": "condition", "rules": [{"id": "rule_high01", "label": "High", "when": {"op": "gt", "answer": "budget", "value": 3}}]}],
                                  links={"scr_quiz01": {"next": "stp_cond01"}, "stp_cond01": {"rule:rule_high01": "scr_end001", "else": "scr_end001"}}), [])
cases["content_errors"] = (doc([scr("scr_aaaaaa", heading("el_h00001", ""), {"id": "el_i00001", "type": "image", "props": {"src": ""}},
                                    buttons("el_b00001", ("it_u00001", "Site", {"kind": "url", "url": "javascript:x"})),
                                    choice("el_c00001", "pick", [("opt_one001", "One")], multiple=True, branchByAnswer=True),
                                    form("el_f00001"), form("el_f00002", ("fld_a00001", "text", "a")))]), [])
cases["answer_keys"] = (doc([scr("scr_aaaaaa", form("el_f00001", ("fld_a00001", "text", "score"), ("fld_b00001", "text", "email"), ("fld_c00001", "email", "email")))]), [])
cases["visibility_and_tokens"] = (doc([scr("scr_aaaaaa", heading("el_h00001", "Hi {{first_name|there}}"), {"id": "el_t00001", "type": "text", "props": {"text": "VIP"}, "visibleIf": {"op": "anyOf", "answer": "tier", "value": ["opt_vip001"]}},
                                           buttons("el_b00001", ("it_n00001", "Go", NEXT))),
                                       scr("scr_bbbbbb", choice("el_c00001", "tier", [("opt_vip001", "VIP"), ("opt_std001", "Std")], autoAdvance=True)), scr("scr_cccccc", heading("el_h00003"))],
                                      links={"scr_aaaaaa": {"next": "scr_bbbbbb"}, "scr_bbbbbb": {"next": "scr_cccccc"}}), [])
cases["compliance"] = (doc([scr("scr_aaaaaa", {"id": "el_i00001", "type": "image", "props": {"src": "https://example.com/a.png"}}, form("el_f00001", ("fld_e00001", "email", "email")))],
                           theme={"colors": {"text": "#dddddd", "background": "#ffffff", "primary": "#ffff00"}}), [])

ROOT_LIB = ROOT / "contracts" / "library" / "templates"
for path in sorted(ROOT_LIB.glob("*.json")):
    template = json.loads(path.read_text())
    cases[f"template_{template['id']}"] = (template["doc"], [])

cases["template_product-quiz"] = (cases["template_product-quiz"][0], [
    {"inputs": [{"at": "scr_welcome", "port": "next", "answers": {}}, {"at": "scr_usage01", "port": "next", "answers": {"usage": "opt_team0001"}},
                {"at": "scr_budget1", "port": "next", "answers": {"budget": "opt_high0001"}}], "path": ["scr_welcome", "scr_usage01", "scr_budget1", "scr_offerb1"], "status": "running"},
    {"inputs": [{"at": "scr_welcome", "port": "next", "answers": {}}, {"at": "scr_usage01", "port": "next", "answers": {"usage": "opt_solo0001"}},
                {"at": "scr_budget1", "port": "next", "answers": {"budget": "opt_low00001"}}], "path": ["scr_welcome", "scr_usage01", "scr_budget1", "scr_offera1"], "status": "running"}])
cases["template_feedback-nps"] = (cases["template_feedback-nps"][0], [
    {"inputs": [{"at": "scr_score01", "port": "next", "answers": {"nps": 2}}], "path": ["scr_score01", "scr_improve"], "status": "running"},
    {"inputs": [{"at": "scr_score01", "port": "next", "answers": {"nps": 7}}], "path": ["scr_score01", "scr_thanks01"], "status": "ended"},
    {"inputs": [{"at": "scr_score01", "port": "next", "answers": {"nps": 10}}], "path": ["scr_score01", "scr_review1"], "status": "running"}])

def op_case(name, question, condition, hit, miss):
    branch = {"id": "stp_cond01", "kind": "condition", "rules": [{"id": "rule_hit001", "label": "Hit", "when": condition}]}
    cases[name] = (
        doc(
            [scr("scr_ask001", question), scr("scr_hit001", heading("el_h00002")), scr("scr_else01", heading("el_h00003"))],
            [branch],
            links={"scr_ask001": {"next": "stp_cond01"}, "stp_cond01": {"rule:rule_hit001": "scr_hit001", "else": "scr_else01"}},
        ),
        [
            {"inputs": [{"at": "scr_ask001", "port": "next", "answers": hit}], "path": ["scr_ask001", "scr_hit001"], "status": "ended", "matched": "rule_hit001"},
            {"inputs": [{"at": "scr_ask001", "port": "next", "answers": miss}], "path": ["scr_ask001", "scr_else01"], "status": "ended", "matched": "else"},
        ],
    )


def single_screen_case(name, element):
    cases[name] = (
        doc(
            [scr("scr_main01", element, buttons("el_b00001", ("it_n00001", "Next", NEXT))), scr("scr_thanks", heading("el_h00002"))],
            links={"scr_main01": {"next": "scr_thanks"}},
        ),
        [],
    )


name_field = form("el_f00001", ("fld_n00001", "text", "name"))
note_field = form("el_f00001", ("fld_n00002", "longtext", "note"))
score_rating = rating("el_r00001", "nps")
tier_choice = choice("el_c00001", "tier", [("opt_vip001", "VIP"), ("opt_std001", "Std")])
tags_choice = choice("el_c00001", "tags", [("opt_a00001", "A"), ("opt_b00001", "B"), ("opt_c00001", "C")], multiple=True)
consent_field = form("el_f00001", ("fld_a00001", "consent", "agree"))
date_field = form("el_f00001", ("fld_d00001", "date", "start"))

op_case("op_equals", name_field, {"op": "equals", "answer": "name", "value": "Ada"}, {"name": "Ada"}, {"name": "Bob"})
op_case("op_notEquals", name_field, {"op": "notEquals", "answer": "name", "value": "Ada"}, {"name": "Bob"}, {"name": "Ada"})
op_case("op_contains", name_field, {"op": "contains", "answer": "name", "value": "Ada"}, {"name": "Adaline"}, {"name": "Bob"})
op_case("op_notContains", name_field, {"op": "notContains", "answer": "name", "value": "Ada"}, {"name": "Bob"}, {"name": "Adaline"})
op_case("op_isEmpty", note_field, {"op": "isEmpty", "answer": "note"}, {"note": ""}, {"note": "Hello"})
op_case("op_isNotEmpty", note_field, {"op": "isNotEmpty", "answer": "note"}, {"note": "Hello"}, {"note": ""})
op_case("op_eq", score_rating, {"op": "eq", "answer": "nps", "value": 5}, {"nps": 5}, {"nps": 4})
op_case("op_neq", score_rating, {"op": "neq", "answer": "nps", "value": 5}, {"nps": 4}, {"nps": 5})
op_case("op_lt", score_rating, {"op": "lt", "answer": "nps", "value": 5}, {"nps": 4}, {"nps": 5})
op_case("op_lte", score_rating, {"op": "lte", "answer": "nps", "value": 5}, {"nps": 5}, {"nps": 6})
op_case("op_between", score_rating, {"op": "between", "answer": "nps", "value": 3, "value2": 6}, {"nps": 4}, {"nps": 9})
op_case("op_noneOf", tier_choice, {"op": "noneOf", "answer": "tier", "value": ["opt_vip001"]}, {"tier": "opt_std001"}, {"tier": "opt_vip001"})
op_case("op_includesAny", tags_choice, {"op": "includesAny", "answer": "tags", "value": ["opt_a00001"]}, {"tags": ["opt_a00001", "opt_c00001"]}, {"tags": ["opt_c00001"]})
op_case("op_includesAll", tags_choice, {"op": "includesAll", "answer": "tags", "value": ["opt_a00001", "opt_b00001"]}, {"tags": ["opt_a00001", "opt_b00001", "opt_c00001"]}, {"tags": ["opt_a00001"]})
op_case("op_includesNone", tags_choice, {"op": "includesNone", "answer": "tags", "value": ["opt_a00001"]}, {"tags": ["opt_b00001"]}, {"tags": ["opt_a00001", "opt_b00001"]})
op_case("op_isTrue", consent_field, {"op": "isTrue", "answer": "agree"}, {"agree": True}, {"agree": False})
op_case("op_isFalse", consent_field, {"op": "isFalse", "answer": "agree"}, {"agree": False}, {"agree": True})
op_case("op_before", date_field, {"op": "before", "answer": "start", "value": "2030-01-01T00:00:00Z"}, {"start": "2029-06-01T00:00:00Z"}, {"start": "2031-01-01T00:00:00Z"})
op_case("op_after", date_field, {"op": "after", "answer": "start", "value": "2030-01-01T00:00:00Z"}, {"start": "2031-01-01T00:00:00Z"}, {"start": "2029-06-01T00:00:00Z"})

cases["issue_empty_screen"] = (doc([scr("scr_empty1"), scr("scr_thanks", heading("el_h00002"))], links={"scr_empty1": {"next": "scr_thanks"}}), [])
cases["issue_countdown_past"] = (
    doc(
        [scr("scr_timer1", {"id": "el_k00001", "type": "countdown", "props": {"deadline": "2000-01-01T00:00:00Z"}}, buttons("el_b00001", ("it_n00001", "Next", NEXT))), scr("scr_thanks", heading("el_h00002"))],
        links={"scr_timer1": {"next": "scr_thanks"}},
    ),
    [],
)
cases["issue_chat_sources"] = (doc([scr("scr_help01", heading("el_h00001")), scr("scr_thanks", heading("el_h00002"))], links={"scr_help01": {"next": "scr_thanks"}}, assistant={"greeting": "Hi there"}), [])
contexts = {
    "issue_countdown_past": {"now": "2026-10-11T00:00:00Z"},
    "issue_chat_sources": {"chatReady": False},
}

single_screen_case("element_spacer", {"id": "el_s00001", "type": "spacer", "props": {"size": "lg"}})
single_screen_case("element_video_youtube", {"id": "el_v00001", "type": "video", "props": {"source": {"kind": "youtube", "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}}})
single_screen_case("element_video_vimeo", {"id": "el_v00001", "type": "video", "props": {"source": {"kind": "vimeo", "url": "https://vimeo.com/76979871"}}})
single_screen_case("element_video_file", {"id": "el_v00001", "type": "video", "props": {"source": {"kind": "file", "url": "https://cdn.example.com/intro.mp4"}}})
single_screen_case("field_phone", form("el_f00001", ("fld_p00001", "phone", "phone", {"required": True})))
single_screen_case("field_number", form("el_f00001", ("fld_q00001", "number", "qty", {"min": 1, "max": 10})))
single_screen_case("field_date", form("el_f00001", ("fld_t00001", "date", "when")))
single_screen_case("field_dropdown", form("el_f00001", ("fld_s00001", "dropdown", "plan", {"options": ["Basic", "Pro"]})))
single_screen_case("display_pictures", choice("el_c00001", "style", [("opt_p00001", "Red", {"image": "https://cdn.example.com/red.webp"}), ("opt_p00002", "Blue", {"image": "https://cdn.example.com/blue.webp"})], display="pictures"))
single_screen_case("display_dropdown", choice("el_c00001", "plan2", [("opt_d00001", "Basic"), ("opt_d00002", "Pro")], display="dropdown"))
single_screen_case("display_yesno", choice("el_c00001", "agree2", [("opt_y00001", "Yes"), ("opt_n00001", "No")], display="yesno"))
single_screen_case("scale_stars", rating("el_r00001", "stars", scale="stars", max=5))
single_screen_case("scale_emoji", rating("el_r00001", "mood", scale="emoji", max=5))
single_screen_case("scale_numbers", rating("el_r00001", "rate", scale="numbers", max=5))

import shutil
shutil.rmtree(OUT, ignore_errors=True)
OUT.mkdir(parents=True)
for name, (raw, runs) in sorted(cases.items()):
    parsed = JourneyDoc.model_validate(raw)
    context = contexts.get(name)
    ctx = None
    if context is not None:
        ctx = ValidationContext(
            now=datetime.fromisoformat(context["now"]) if "now" in context else None,
            chat_ready=context.get("chatReady"),
        )
    expect = {
        "ports": {s.id: [p.port for p in ports_of(parsed, s.id)] for s in parsed.steps},
        "outputs": {sid: [{"key": o.key, "type": o.type} for o in screen_outputs(s)] for sid, s in parsed.screens.items()},
        "issues": sorted(
            [{"code": i.code, "target": i.target.as_dict()} for i in validate(parsed, ctx)],
            key=lambda x: (x["code"], json.dumps(x["target"], sort_keys=True)),
        ),
        "runs": runs,
    }
    payload = {"doc": raw, "expect": expect} | ({"context": context} if context is not None else {})
    (OUT / f"{name}.json").write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
print(len(cases), "cases")
