import json
import pathlib

OUT = pathlib.Path("contracts/fixtures/docs/v3")
OUT.mkdir(parents=True, exist_ok=True)

def base(nodes, screens, edges, theme=None, ask_ai=True):
    doc = {"schemaVersion": 3, "nodes": nodes, "screens": screens, "edges": edges}
    doc["theme"] = theme or {"primary": "#4f46e5", "accent": "#f97316", "surface": "#ffffff", "foreground": "#111827", "font": "Inter", "radius": 16, "cta": "Continue"}
    if ask_ai:
        doc["askAi"] = {"id": "ask-ai", "placeholder": "Ask...", "buttonLabel": "Ask", "refusalMessage": "Out of context.", "ragK": 8, "allowJourneyJump": True, "allowRag": True}
    return doc

def trig():
    return {"id": "trigger", "type": "trigger", "position": {"x": -260, "y": 220}, "config": {}}

def end(url="https://example.com/done"):
    return {"id": "end", "type": "end", "position": {"x": 700, "y": 220}, "config": {"redirectUrl": url, "redirectDelayMs": 1500}}

def end_msg(msg="Thanks for visiting"):
    return {"id": "end", "type": "end", "position": {"x": 700, "y": 220}, "config": {"message": msg}}

def screen(sid, blocks, advance=None):
    return {"id": sid, "name": sid, "position": {"x": 60, "y": 160}, "size": {"width": 440, "height": 560}, "blocks": blocks, "layout": {"mode": "stack"}, "advance": advance or {"mode": "button", "handle": "default", "label": "Continue"}, "back": {"show": False, "label": "Back"}}

def edge(eid, src, tgt, handle=None):
    return {"id": eid, "source": src, "target": tgt, "sourceHandle": handle}

NODE_DEFAULTS = {
    "text": {"content": "Hello world"},
    "image": {"src": "https://example.com/a.jpg", "alt": "Sample"},
    "video": {"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
    "button": {"label": "Continue", "variant": "solid", "size": "md"},
    "input": {"type": "email", "label": "Email", "placeholder": "you@example.com", "required": True, "blockKey": "email"},
    "select": {"label": "Size", "options": [{"value": "s", "label": "Small"}, {"value": "m", "label": "Medium"}], "required": True, "blockKey": "size"},
    "checkbox": {"label": "Subscribe", "required": False, "blockKey": "consent"},
    "rating": {"question": "Rate us", "max": 5, "blockKey": "rating"},
    "divider": {},
    "card": {"title": "Plan", "text": "Best plan", "ctaLabel": "Choose"},
    "hero_section": {"headline": "Welcome", "subheadline": "Sub", "image": "https://example.com/h.jpg", "ctas": []},
    "quiz": {"question": "Pick one", "options": [{"id": "o1", "label": "A"}, {"id": "o2", "label": "B"}], "type": "mcq", "allowSkip": True, "blockKey": "quiz_q"},
    "form": {"fields": [{"id": "f1", "type": "input", "label": "Name", "required": True}], "submitLabel": "Submit", "blockKey": "form_main"},
    "countdown": {"endTime": "2030-01-01T00:00:00Z", "label": "Ends in"},
    "alert": {"message": "Heads up"},
    "badge": {"label": "New"},
    "ask_ai": {"placeholder": "Ask..."},
}

cases = {}

for ntype, cfg in NODE_DEFAULTS.items():
    bid = f"b_{ntype}"
    nodes = [trig(), {"id": bid, "type": ntype, "position": {"x": 0, "y": 0}, "config": dict(cfg)}, end()]
    if ntype in ("input", "select", "checkbox", "rating", "quiz"):
        nodes[1]["config"].setdefault("blockKey", f"field_{ntype}")
    screens = [screen("s1", [bid])]
    edges = [edge("e1", "trigger", "s1"), edge("e2", "s1", "end", "default")]
    cases[f"node_{ntype}"] = base(nodes, screens, edges)

cases["advance_button"] = base(
    [trig(), {"id": "b1", "type": "text", "position": {"x": 0, "y": 0}, "config": {"content": "Hi"}}, end()],
    [screen("s1", ["b1"], {"mode": "button", "handle": "default", "label": "Go"})],
    [edge("e1", "trigger", "s1"), edge("e2", "s1", "end", "default")],
)
cases["advance_block"] = base(
    [trig(), {"id": "b1", "type": "button", "position": {"x": 0, "y": 0}, "config": {"label": "Go", "blockOwnsExit": True}}, end()],
    [screen("s1", ["b1"], {"mode": "block"})],
    [edge("e1", "trigger", "s1"), edge("e2", "s1", "end", "b1:default")],
)
cases["advance_none"] = base(
    [trig(), {"id": "b1", "type": "text", "position": {"x": 0, "y": 0}, "config": {"content": "Bye"}}, end_msg()],
    [screen("s1", ["b1"], {"mode": "none"})],
    [edge("e1", "trigger", "s1")],
)
cases["advance_auto"] = base(
    [trig(), {"id": "b1", "type": "quiz", "position": {"x": 0, "y": 0}, "config": {"question": "Q?", "options": [{"id": "o1", "label": "A"}], "blockKey": "q1"}}, end()],
    [screen("s1", ["b1"], {"mode": "button", "handle": "default"})],
    [edge("e1", "trigger", "s1"), edge("e2", "s1", "end", "b1:answered")],
)

for op in ["eq", "neq", "contains", "gt", "lt", "gte", "lte"]:
    cases[f"operator_{op}"] = base(
        [trig(), {"id": "c1", "type": "condition", "position": {"x": 100, "y": 100}, "config": {"field": "age", "operator": op, "value": 18, "branches": [{"handle": "yes", "operator": op, "value": 18}]}}, {"id": "b1", "type": "text", "position": {"x": 0, "y": 0}, "config": {"content": "A"}}, {"id": "b2", "type": "text", "position": {"x": 0, "y": 1}, "config": {"content": "B"}}, end()],
        [screen("s1", ["b1"]), screen("s2", ["b2"])],
        [edge("e1", "trigger", "s1"), edge("e2", "s1", "c1", "default"), edge("e3", "c1", "s2", "yes"), edge("e4", "c1", "end", "else"), edge("e5", "s2", "end", "default")],
    )

cases["condition_branches"] = base(
    [trig(), {"id": "c1", "type": "condition", "position": {"x": 100, "y": 100}, "config": {"field": "budget", "branches": [{"handle": "premium", "operator": "eq", "value": "high"}, {"handle": "basic", "operator": "eq", "value": "low"}], "elseHandle": "else"}}, {"id": "b1", "type": "text", "position": {"x": 0, "y": 0}, "config": {"content": "Start"}}, {"id": "b2", "type": "text", "position": {"x": 0, "y": 0}, "config": {"content": "Premium"}}, {"id": "b3", "type": "text", "position": {"x": 0, "y": 0}, "config": {"content": "Basic"}}, end()],
    [screen("s1", ["b1"]), screen("s2", ["b2"]), screen("s3", ["b3"])],
    [edge("e1", "trigger", "s1"), edge("e2", "s1", "c1", "default"), edge("e3", "c1", "s2", "premium"), edge("e4", "c1", "s3", "basic"), edge("e5", "c1", "end", "else"), edge("e6", "s2", "end", "default"), edge("e7", "s3", "end", "default")],
)
cases["quiz_scoring"] = base(
    [trig(), {"id": "q1", "type": "quiz", "position": {"x": 0, "y": 0}, "config": {"question": "Style?", "options": [{"id": "o1", "label": "A", "points": 10}, {"id": "o2", "label": "B", "points": 1}], "blockKey": "style", "scoring": "points"}}, end()],
    [screen("s1", ["q1"])],
    [edge("e1", "trigger", "s1"), edge("e2", "s1", "end", "default")],
)
cases["overrides_all"] = base(
    [trig(), {"id": "b1", "type": "text", "position": {"x": 0, "y": 0}, "config": {"content": "Hi", "style": {"fontSize": "14px"}, "responsive": {"mobile": {"fontSize": "16px"}, "tablet": {"fontSize": "18px"}, "desktop": {"fontSize": "20px"}}}}, end()],
    [screen("s1", ["b1"])],
    [edge("e1", "trigger", "s1"), edge("e2", "s1", "end", "default")],
)
cases["pathology_orphan"] = base(
    [trig(), {"id": "b1", "type": "text", "position": {"x": 0, "y": 0}, "config": {"content": "Seen"}}, {"id": "bx", "type": "text", "position": {"x": 0, "y": 0}, "config": {"content": "Orphan"}}, end()],
    [screen("s1", ["b1"])],
    [edge("e1", "trigger", "s1"), edge("e2", "s1", "end", "default")],
)
cases["pathology_cycle"] = base(
    [trig(), {"id": "b1", "type": "text", "position": {"x": 0, "y": 0}, "config": {"content": "A"}}, {"id": "b2", "type": "text", "position": {"x": 0, "y": 0}, "config": {"content": "B"}}, end()],
    [screen("s1", ["b1"]), screen("s2", ["b2"])],
    [edge("e1", "trigger", "s1"), edge("e2", "s1", "s2", "default"), edge("e3", "s2", "s1", "default")],
)
cases["pathology_duplicate_handle"] = base(
    [trig(), {"id": "b1", "type": "button", "position": {"x": 0, "y": 0}, "config": {"label": "Go"}}, end()],
    [screen("s1", ["b1"])],
    [edge("e1", "trigger", "s1"), edge("e2", "s1", "end", "default"), edge("e3", "s1", "end", "default")],
)
cases["pathology_missing_trigger"] = base(
    [{"id": "b1", "type": "text", "position": {"x": 0, "y": 0}, "config": {"content": "No trigger"}}, end()],
    [screen("s1", ["b1"])],
    [edge("e2", "s1", "end", "default")],
)
cases["pathology_multi_trigger"] = base(
    [trig(), {"id": "trigger2", "type": "trigger", "position": {"x": -260, "y": 300}, "config": {}}, {"id": "b1", "type": "text", "position": {"x": 0, "y": 0}, "config": {"content": "A"}}, end()],
    [screen("s1", ["b1"])],
    [edge("e1", "trigger", "s1"), edge("e2", "s1", "end", "default")],
)
cases["pathology_timeout"] = base(
    [trig(), {"id": "b1", "type": "text", "position": {"x": 0, "y": 0}, "config": {"content": "A", "timeoutSeconds": 30}}, end()],
    [screen("s1", ["b1"])],
    [edge("e1", "trigger", "s1"), edge("e2", "s1", "end", "default")],
)
cases["shared_block"] = base(
    [trig(), {"id": "b1", "type": "text", "position": {"x": 0, "y": 0}, "config": {"content": "Shared"}}, end()],
    [screen("s1", ["b1"]), screen("s2", ["b1"])],
    [edge("e1", "trigger", "s1"), edge("e2", "s1", "s2", "default"), edge("e3", "s2", "end", "default")],
)
cases["askai_both"] = base(
    [trig(), {"id": "ask-ai-node", "type": "ask_ai", "position": {"x": -260, "y": -60}, "config": {"placeholder": "Ask..."}}, {"id": "b1", "type": "text", "position": {"x": 0, "y": 0}, "config": {"content": "Hi"}}, end()],
    [screen("s1", ["b1"])],
    [edge("e1", "trigger", "s1"), edge("e2", "s1", "end", "default")],
)

for name, doc in sorted(cases.items()):
    (OUT / f"{name}.json").write_text(json.dumps(doc, indent=2, sort_keys=True) + "\n")

print(f"wrote {len(cases)} fixtures")
