import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services" / "api"))

from app.modules.journeys.domain.ports import ports_of, screen_outputs
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

import shutil
shutil.rmtree(OUT, ignore_errors=True)
OUT.mkdir(parents=True)
for name, (raw, runs) in sorted(cases.items()):
    parsed = JourneyDoc.model_validate(raw)
    expect = {
        "ports": {s.id: [p.port for p in ports_of(parsed, s.id)] for s in parsed.steps},
        "outputs": {sid: [{"key": o.key, "type": o.type} for o in screen_outputs(s)] for sid, s in parsed.screens.items()},
        "issues": sorted(
            [{"code": i.code, "target": i.target.as_dict()} for i in validate(parsed)],
            key=lambda x: (x["code"], json.dumps(x["target"], sort_keys=True)),
        ),
        "runs": runs,
    }
    (OUT / f"{name}.json").write_text(json.dumps({"doc": raw, "expect": expect}, indent=2, sort_keys=True) + "\n")
print(len(cases), "cases")
