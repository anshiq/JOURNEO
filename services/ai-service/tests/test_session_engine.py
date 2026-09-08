import asyncio
from app.sessions import engine as E
from app.sessions.store import GraphCache, SessionStore, new_session


def graph():
    return {
        "theme": {},
        "askAi": {"ragK": 8},
        "screens": [
            {"id": "s1", "name": "Welcome", "position": {"x": 0, "y": 0}, "size": {"width": 320, "height": 420}, "blocks": ["a"], "layout": {}, "advance": {"mode": "button", "handle": "default"}, "back": {"show": False}},
            {"id": "s2", "name": "Adult", "position": {"x": 400, "y": 0}, "size": {"width": 320, "height": 420}, "blocks": ["b"], "layout": {}, "advance": {"mode": "button", "handle": "default"}, "back": {"show": True}},
            {"id": "s3", "name": "Kid", "position": {"x": 400, "y": 500}, "size": {"width": 320, "height": 420}, "blocks": ["k"], "layout": {}, "advance": {"mode": "button", "handle": "default"}, "back": {"show": True}},
        ],
        "nodes": [
            {"id": "t", "type": "trigger", "config": {}},
            {"id": "a", "type": "text", "config": {"content": "hi"}},
            {"id": "c", "type": "condition", "config": {"field": "age", "operator": "gte", "value": 18}},
            {"id": "b", "type": "text", "config": {"content": "adult"}},
            {"id": "k", "type": "text", "config": {"content": "kid"}},
            {"id": "e", "type": "end", "config": {}},
        ],
        "edges": [
            {"id": "e1", "source": "t", "target": "s1"},
            {"id": "e2", "source": "s1", "target": "c", "sourceHandle": "default"},
            {"id": "e3", "source": "c", "target": "s2", "sourceHandle": "true"},
            {"id": "e4", "source": "c", "target": "s3", "sourceHandle": "false"},
            {"id": "e5", "source": "s2", "target": "e"},
            {"id": "e6", "source": "s3", "target": "e"},
        ],
    }


def test_entry_prefers_trigger_target():
    ent = E.entry_vertex(graph())
    assert ent["id"] == "s1"


def test_match_edge_handle_then_first():
    g = graph()
    outs = E.outgoing(g, "c")
    assert E.match_edge(outs, "false")["target"] == "s3"
    assert E.match_edge(outs, "nope")["target"] == "s2"
    assert E.match_edge([], "true") is None


def test_eval_operator():
    assert E.eval_operator("18", "gte", 18)
    assert E.eval_operator("a@b", "contains", "@")
    assert not E.eval_operator("x", "gt", 1)
    assert E.eval_operator("a", "neq", "b")


def test_local_branch():
    assert E.local_branch({"field": "age", "operator": "gte", "value": 18}, {"age": 20}) == "true"
    assert E.local_branch({"field": "age", "operator": "gte", "value": 18}, {"age": 3}) == "false"
    assert E.local_branch({"field": "age", "operator": "weird", "value": 1}, {}) is None
    assert E.local_branch({}, {}) is None


async def boom(node, profile):
    raise AssertionError("decide must not be called for local operators")


def test_step_serves_first_screen():
    g = graph()
    sess = new_session("j", "c", "live", 1, "t")
    kind, screen, blocks, choices = asyncio.run(E.step(sess, g, E.node_index(g), boom))
    assert kind == "screen" and screen["id"] == "s1"
    assert [b["nodeId"] for b in blocks] == ["a"]
    assert choices[0]["handle"] == "default"


def test_full_walk_adult_branch():
    g = graph()
    nodes = E.node_index(g)
    sess = new_session("j", "c", "live", 1, "t")
    sess["profile"] = {"age": 30}
    seen = []
    for _ in range(8):
        res = asyncio.run(E.step(sess, g, nodes, boom))
        if res[0] == "end":
            seen.append(("end", res[1]))
            break
        _, screen, _, _ = res
        seen.append(("screen", screen["id"]))
        nxt = E.apply_choice(sess, g, nodes, None, None)
        assert nxt[0] == "moved"
    assert ("screen", "s2") in seen and ("end", "completed") in seen


def test_full_walk_kid_branch():
    g = graph()
    nodes = E.node_index(g)
    sess = new_session("j", "c", "live", 1, "t")
    sess["profile"] = {"age": 5}
    ids = []
    for _ in range(8):
        res = asyncio.run(E.step(sess, g, nodes, boom))
        if res[0] == "end":
            break
        _, screen, _, _ = res
        ids.append(screen["id"])
        E.apply_choice(sess, g, nodes, None, None)
    assert "s3" in ids and "s2" not in ids


def test_step_unknown_condition_uses_decide():
    g = graph()
    nodes = E.node_index(g)
    for n in g["nodes"]:
        if n["id"] == "c":
            n["config"] = {"field": "intent", "operator": "ai"}
    sess = new_session("j", "c", "live", 1, "c")

    async def decide(node, profile):
        return "false"

    res = asyncio.run(E.step(sess, g, nodes, decide))
    assert res[0] == "screen" and res[1]["id"] == "s3"
    assert sess["current_id"] == "s3"


def test_apply_choice_payload_merges_profile():
    g = graph()
    sess = new_session("j", "c", "live", 1, "s1")
    res = E.apply_choice(sess, g, E.node_index(g), "default", {"age": 41})
    assert res[0] == "moved" and sess["profile"]["age"] == 41


def test_terminal_screen_without_edges_ends():
    g = {"screens": [{"id": "s1", "blocks": [], "advance": {"mode": "button", "handle": "default"}}], "nodes": [], "edges": []}
    sess = new_session("j", "c", "live", 1, "s1")
    res = asyncio.run(E.step(sess, g, E.node_index(g), boom))
    assert res[0] == "end"
    assert E.apply_choice(sess, g, E.node_index(g), None, None)[0] == "end"


def test_cache_invalidate_only_newer():
    cache = GraphCache()

    async def run():
        await cache.put("j", 3, {"nodes": []})
        assert await cache.invalidate("j", 2) is False
        assert (await cache.get("j"))[0] == 3
        assert await cache.invalidate("j", 4) is True
        assert await cache.get("j") is None

    asyncio.run(run())


def test_store_create_and_test_sockets():
    store = SessionStore()

    async def run():
        s1 = await store.create("j", "c", "test", 1, "t")
        s2 = await store.create("j", "c", "live", 1, "t")
        await store.attach(s1["id"], object())
        await store.attach(s2["id"], object())
        only = await store.test_sockets_for("j")
        assert [sid for sid, _ in only] == [s1["id"]]

    asyncio.run(run())


def test_find_path():
    g = graph()
    assert E.find_path(g, "s1", "s1") == ["s1"]
    assert E.find_path(g, "s1", "s2") == ["s1", "c", "s2"]
    assert E.find_path(g, "e", "s1") is None


def test_jump_to_forward():
    g = graph()
    sess = new_session("j", "c", "test", 1, "s1")
    kind, _, target = E.jump_to(sess, g, E.node_index(g), "s2")
    assert kind == "moved" and target == "s2"
    assert sess["current_id"] == "s2"


def test_jump_to_by_block_resolves_screen():
    g = graph()
    sess = new_session("j", "c", "test", 1, "s1")
    kind, _, target = E.jump_to(sess, g, E.node_index(g), "b")
    assert kind == "moved" and target == "s2"
    assert sess["current_id"] == "s2"


def test_jump_to_unknown_node_unreachable():
    g = graph()
    sess = new_session("j", "c", "test", 1, "s1")
    assert E.jump_to(sess, g, E.node_index(g), "zz")[0] == "unreachable"
    assert sess["current_id"] == "s1"


def test_jump_to_same_node_noop():
    g = graph()
    sess = new_session("j", "c", "test", 1, "s1")
    kind, _, target = E.jump_to(sess, g, E.node_index(g), "s1")
    assert kind == "moved" and target == "s1"
    assert sess["current_id"] == "s1" and sess["history"] == []


def test_screen_timeout_ms_seconds():
    assert E.screen_timeout_ms({"id": "s1", "timeoutSeconds": 10}) == 10000


def test_screen_timeout_ms_absent_or_invalid():
    assert E.screen_timeout_ms({"id": "s1"}) is None
    assert E.screen_timeout_ms({"id": "s1", "timeoutSeconds": 0}) is None
    assert E.screen_timeout_ms({"id": "s1", "timeoutSeconds": -5}) is None
    assert E.screen_timeout_ms({"id": "s1", "timeoutSeconds": "soon"}) is None
    assert E.screen_timeout_ms({"id": "s1", "timeoutSeconds": 99999999}) is None


def test_block_owner():
    g = graph()
    assert E.block_owner(g) == {"a": "s1", "b": "s2", "k": "s3"}


def test_screen_exits_block_owned():
    g = graph()
    for n in g["nodes"]:
        if n["id"] == "a":
            n["config"] = {"blockOwnsExit": True}
    g["edges"].append({"id": "ex", "source": "s1", "target": "s2", "sourceHandle": "a:answered"})
    for n in g["nodes"]:
        if n["id"] == "a":
            n["type"] = "quiz"
    exits = E.screen_exits(g, g["screens"][0])
    assert any(x["handle"] == "a:answered" for x in exits)


def test_auto_advance_single_edge_moves():
    g = graph()
    sess = new_session("j", "c", "live", 1, "t")
    res = E.auto_advance(sess, g, E.node_index(g))
    assert res[0] == "moved" and sess["current_id"] == "s1"


def test_auto_advance_multiple_edges_skips():
    g = {"screens": [], "nodes": [{"id": "c", "type": "condition", "config": {}}], "edges": [{"id": "a", "source": "c", "target": "x"}, {"id": "b", "source": "c", "target": "y"}]}
    sess = new_session("j", "c", "live", 1, "c")
    sess["profile"] = {"age": 30}
    res = E.auto_advance(sess, g, E.node_index(g))
    assert res[0] == "skip"
    assert sess["current_id"] == "c" and sess["history"] == []


def test_auto_advance_no_edges_ends():
    g = {"screens": [{"id": "s1", "blocks": []}], "nodes": [], "edges": []}
    sess = new_session("j", "c", "live", 1, "s1")
    kind, reason = E.auto_advance(sess, g, E.node_index(g))
    assert kind == "end" and reason == "timeout"


def test_go_back_restores_previous_screen():
    g = graph()
    sess = new_session("j", "c", "live", 1, "t")
    E.auto_advance(sess, g, E.node_index(g))
    assert sess["current_id"] == "s1" and sess["step_index"] == 1
    kind, target = E.go_back(sess)
    assert kind == "moved" and target == "t"
    assert sess["current_id"] == "t" and sess["step_index"] == 0 and sess["history"] == []


def test_go_back_at_start_noop():
    sess = new_session("j", "c", "live", 1, "s1")
    assert E.go_back(sess) == ("noop", "at-start")
    assert sess["current_id"] == "s1" and sess["step_index"] == 0
