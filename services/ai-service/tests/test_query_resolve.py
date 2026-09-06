import json
from app.graphs.subflows import query_resolve_subflow as Q
from app.sessions import engine as E


def graph():
    return {
        "nodes": [
            {"id": "t", "type": "trigger", "config": {}},
            {"id": "p", "type": "text", "config": {"content": "iPhone 15 Pro price 999 camera details"}},
            {"id": "q", "type": "ask_ai", "config": {"ragK": 8}},
            {"id": "e", "type": "end", "config": {}},
        ],
        "edges": [
            {"id": "e1", "source": "t", "target": "p"},
            {"id": "e2", "source": "p", "target": "e"},
        ],
    }


def apple_graph():
    return {
        "nodes": [
            {"id": "t", "type": "trigger", "config": {}},
            {"id": "n2", "type": "hero_section", "config": {"headline": "iPhone 15 Pro", "subheadline": "Titanium. So strong. So light. So Pro.", "ctas": [{"label": "Buy from $999"}]}},
            {"id": "n5", "type": "text", "config": {"content": "iPhone 15 Pro price 999 camera details"}},
            {"id": "q", "type": "ask_ai", "config": {}},
            {"id": "e", "type": "end", "config": {}},
        ],
        "edges": [
            {"id": "e1", "source": "t", "target": "n2"},
            {"id": "e2", "source": "n2", "target": "e"},
        ],
    }


class FakeLLM:
    def __init__(self, payload=None, exc=None):
        self.payload = payload
        self.exc = exc
        self.prompts = []

    def invoke(self, prompt):
        self.prompts.append(prompt)
        if self.exc:
            raise self.exc
        return type("R", (), {"content": json.dumps(self.payload)})()


def mock_llm(monkeypatch, payload=None, exc=None):
    fake = FakeLLM(payload, exc)
    monkeypatch.setattr(Q, "invoke_with_fallback", lambda prompt: fake.invoke(prompt))
    monkeypatch.setattr(Q, "llm_available", lambda: True)
    return fake


def mock_retrieval(monkeypatch, chunks):
    monkeypatch.setattr(Q, "retrieve_for_llm", lambda *a, **k: chunks)


def test_summarize_captures_text_and_scalars():
    s = Q.summarize_graph(graph())
    by_id = {x["id"]: x for x in s}
    assert "iphone" in by_id["p"]["text"].lower()
    assert "q" not in by_id


def test_parse_llm_output():
    tid, conf, ans, reason = Q.parse_llm_output('{"targetNodeId": "p", "confidence": 0.9, "answer": "It costs $999.", "reason": "price"}')
    assert (tid, conf, ans) == ("p", 0.9, "It costs $999.")
    assert Q.parse_llm_output("no json here")[0] is None


def test_prompt_contains_graph_and_chunks(monkeypatch):
    fake = mock_llm(monkeypatch, {"targetNodeId": None, "confidence": 0, "answer": "", "reason": "none"})
    mock_retrieval(monkeypatch, [{"chunk_id": 1, "content": "Warranty two years", "similarity": 0.4}])
    Q.resolve_query({"query": "hi?", "journey_graph": graph(), "config": {}, "attempt": 1})
    prompt = fake.prompts[0]
    assert "iPhone 15 Pro" in prompt
    assert "Warranty two years" in prompt


def test_jump_from_journey(monkeypatch):
    mock_llm(monkeypatch, {"targetNodeId": "n2", "confidence": 0.9, "answer": "It is the iPhone 15 Pro.", "reason": "name"})
    mock_retrieval(monkeypatch, [])
    out = Q.resolve_query({"query": "which model?", "journey_graph": apple_graph(), "config": {}, "attempt": 1})
    assert out["decision"] == "jump"
    assert out["target_node_id"] == "n2"
    assert out["target_node_type"] == "hero_section"
    assert out["answer"] == "It is the iPhone 15 Pro."
    assert (out.get("target_node_details") or {}).get("title") == "iPhone 15 Pro"
    assert out["citations"] == []


def test_low_confidence_pick_does_not_jump(monkeypatch):
    mock_llm(monkeypatch, {"targetNodeId": "n2", "confidence": 0.2, "answer": "Maybe the iPhone?", "reason": "weak"})
    mock_retrieval(monkeypatch, [{"chunk_id": 3, "content": "Store hours 9-5", "similarity": 0.3}])
    out = Q.resolve_query({"query": "which model?", "journey_graph": apple_graph(), "config": {}, "attempt": 1})
    assert out["decision"] == "rag"
    assert out.get("target_node_id") is None
    assert out["answer"] == "Maybe the iPhone?"


def test_message_from_knowledge(monkeypatch):
    mock_llm(monkeypatch, {"targetNodeId": None, "confidence": 0.8, "answer": "Warranty lasts two years [1].", "reason": "kb"})
    mock_retrieval(monkeypatch, [{"chunk_id": 7, "content": "Warranty two years", "similarity": 0.6}])
    out = Q.resolve_query({"query": "warranty?", "journey_graph": graph(), "config": {}, "attempt": 1})
    assert out["decision"] == "rag"
    assert out.get("target_node_id") is None
    assert "two years" in out["answer"]
    assert out["citations"][0]["chunk_id"] == 7


def test_out_of_context_when_nothing_matches(monkeypatch):
    mock_llm(monkeypatch, {"targetNodeId": None, "confidence": 0, "answer": "", "reason": "none"})
    mock_retrieval(monkeypatch, [])
    out = Q.resolve_query({"query": "zzzqqq?", "journey_graph": graph(), "config": {}, "attempt": 1})
    assert out["decision"] == "reject"
    assert out["answer"] == "This question is out of context."
    assert out.get("target_node_id") is None


def test_custom_refusal_message_used(monkeypatch):
    mock_llm(monkeypatch, {"targetNodeId": None, "confidence": 0, "answer": "", "reason": "none"})
    mock_retrieval(monkeypatch, [])
    out = Q.resolve_query({"query": "zzz?", "journey_graph": graph(), "config": {"refusalMessage": "Nope."}, "attempt": 1})
    assert out["answer"] == "Nope."


def test_unknown_node_id_treated_as_message(monkeypatch):
    mock_llm(monkeypatch, {"targetNodeId": "ghost", "confidence": 0.9, "answer": "Here.", "reason": "bad"})
    mock_retrieval(monkeypatch, [])
    out = Q.resolve_query({"query": "x?", "journey_graph": graph(), "config": {}, "attempt": 1})
    assert out["decision"] == "rag"
    assert out.get("target_node_id") is None


def test_floating_node_never_jumped(monkeypatch):
    mock_llm(monkeypatch, {"targetNodeId": "q", "confidence": 0.95, "answer": "Ask me.", "reason": "bad"})
    mock_retrieval(monkeypatch, [])
    out = Q.resolve_query({"query": "x?", "journey_graph": graph(), "config": {}, "attempt": 1})
    assert out["decision"] == "rag"
    assert out.get("target_node_id") is None


def test_jump_disabled_by_toggle(monkeypatch):
    mock_llm(monkeypatch, {"targetNodeId": "n2", "confidence": 0.9, "answer": "iPhone 15 Pro.", "reason": "name"})
    mock_retrieval(monkeypatch, [])
    out = Q.resolve_query({"query": "model?", "journey_graph": apple_graph(), "config": {"allowJourneyJump": False}, "attempt": 1})
    assert out["decision"] == "rag"
    assert out.get("target_node_id") is None


def test_rag_disabled_skips_retrieval(monkeypatch):
    fake = mock_llm(monkeypatch, {"targetNodeId": None, "confidence": 0, "answer": "", "reason": "none"})
    called = {}

    def boom(*a, **k):
        called["yes"] = True
        raise AssertionError("must not retrieve")

    monkeypatch.setattr(Q, "retrieve_for_llm", boom)
    out = Q.resolve_query({"query": "x?", "journey_graph": graph(), "config": {"allowRag": False}, "attempt": 1})
    assert "yes" not in called
    assert "(none)" in fake.prompts[0]
    assert out["decision"] == "reject"


def test_llm_down_returns_out_of_context(monkeypatch):
    monkeypatch.setattr(Q, "llm_available", lambda: False)
    out = Q.resolve_query({"query": "model?", "journey_graph": apple_graph(), "config": {}, "attempt": 1})
    assert out["decision"] == "reject"
    assert out["reason"] == "llm-unavailable"


def test_llm_error_returns_out_of_context(monkeypatch):
    mock_llm(monkeypatch, exc=RuntimeError("boom"))
    mock_retrieval(monkeypatch, [{"chunk_id": 1, "content": "x", "similarity": 0.1}])
    out = Q.resolve_query({"query": "model?", "journey_graph": apple_graph(), "config": {}, "attempt": 1})
    assert out["decision"] == "reject"
    assert out["answer"] == "This question is out of context."


def test_rejects_empty_query():
    out = Q.resolve_query({"query": "  ", "journey_graph": graph(), "config": {}, "attempt": 1})
    assert out["decision"] == "reject"
    assert out["reason"] == "empty-query"


def test_node_details_friendly_hero():
    d = Q.node_details({"id": "n2", "type": "hero_section", "config": {"badge": "Titanium", "headline": "iPhone 15 Pro", "subheadline": "Titanium design.", "image": "https://x/y.jpg", "ctas": [{"label": "Buy from $999"}]}})
    assert d["title"] == "iPhone 15 Pro"
    assert d["subtitle"] == "Titanium design."
    assert all(f["label"] != "image" for f in d["facts"])
    assert any("Buy from $999" in f["value"] for f in d["facts"])


def test_template_answer_fallback():
    d = {"title": "iPhone 15 Pro", "subtitle": "Titanium design.", "facts": []}
    assert Q.template_answer(d) == "iPhone 15 Pro. Titanium design."
    assert Q.template_answer({}) == ""


def test_engine_ask_ai_helpers():
    g = graph()
    assert E.find_ask_ai_node(g)["id"] == "q"
    assert E.ask_ai_config(g)["ragK"] == 8
    assert E.ask_ai_config(g, "q")["ragK"] == 8
    assert E.ask_ai_config({"nodes": [], "edges": []}) == {}
    assert E.entry_node(g)["id"] == "t"
    floating_only = {"nodes": [{"id": "q", "type": "ask_ai", "config": {}}], "edges": []}
    assert E.entry_node(floating_only)["id"] == "q"


def test_jump_to_floating_node_always_reachable():
    from app.sessions.store import new_session
    g = graph()
    nodes = E.node_index(g)
    sess = new_session("j", "c", "test", 1, "t")
    kind, _, target = E.jump_to(sess, g, nodes, "q")
    assert kind == "moved" and target == "q"
    assert sess["current_id"] == "q"


def test_summarize_excludes_floating_node():
    s = Q.summarize_graph(graph())
    assert all(x["type"] != "ask_ai" for x in s)
    assert any(x["id"] == "p" for x in s)


def test_fallback_model_used_when_primary_fails(monkeypatch):
    calls = []

    def fake_invoke(prompt):
        calls.append(prompt)
        if len(calls) == 1:
            raise RuntimeError("429 rate limited")
        payload = {"targetNodeId": "n2", "confidence": 0.9, "answer": "iPhone 15 Pro.", "reason": "fb"}
        return type("R", (), {"content": json.dumps(payload)})()

    from app.llm import client as C
    monkeypatch.setattr(C, "get_llm", lambda *a, **k: type("L", (), {"invoke": staticmethod(fake_invoke)})())
    monkeypatch.setattr(Q, "llm_available", lambda: True)
    monkeypatch.setattr(Q, "retrieve_for_llm", lambda *a, **k: [])
    out = Q.resolve_query({"query": "model?", "journey_graph": apple_graph(), "config": {}, "attempt": 1})
    assert out["decision"] == "jump"
    assert len(calls) == 2
