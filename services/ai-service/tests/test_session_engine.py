import asyncio
from app.sessions import engine as E
from app.sessions.store import GraphCache, SessionStore, new_session


def graph():
    return {
        "nodes": [
            {"id": "t", "type": "trigger", "config": {}},
            {"id": "a", "type": "text", "config": {"content": "hi"}},
            {"id": "c", "type": "condition", "config": {"field": "age", "operator": "gte", "value": 18}},
            {"id": "b", "type": "text", "config": {"content": "adult"}},
            {"id": "k", "type": "text", "config": {"content": "kid"}},
            {"id": "e", "type": "end", "config": {}},
        ],
        "edges": [
            {"id": "e1", "source": "t", "target": "a"},
            {"id": "e2", "source": "a", "target": "c"},
            {"id": "e3", "source": "c", "target": "b", "sourceHandle": "true"},
            {"id": "e4", "source": "c", "target": "k", "sourceHandle": "false"},
            {"id": "e5", "source": "b", "target": "e"},
            {"id": "e6", "source": "k", "target": "e"},
        ],
    }


def test_entry_prefers_trigger():
    assert E.entry_node(graph())["id"] == "t"


def test_match_edge_handle_then_first():
    g = graph()
    outs = E.outgoing(g, "c")
    assert E.match_edge(outs, "false")["target"] == "k"
    assert E.match_edge(outs, "nope")["target"] == "b"
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


def test_step_serves_first_content_node():
    g = graph()
    sess = new_session("j", "c", "live", 1, "t")
    kind, node, choices = asyncio.run(E.step(sess, g, E.node_index(g), boom))
    assert kind == "node" and node["id"] == "a"
    assert choices == [{"handle": "default", "label": "Continue"}]


def test_full_walk_adult_branch():
    g = graph()
    nodes = E.node_index(g)
    sess = new_session("j", "c", "live", 1, "t")
    sess["profile"] = {"age": 30}
    seen = []
    for _ in range(6):
        res = asyncio.run(E.step(sess, g, nodes, boom))
        if res[0] == "end":
            seen.append(("end", res[1]))
            break
        _, node, _ = res
        seen.append(("node", node["id"]))
        nxt = E.apply_choice(sess, g, nodes, None, None)
        assert nxt[0] == "moved"
    assert ("node", "b") in seen and ("end", "completed") in seen


def test_full_walk_kid_branch():
    g = graph()
    nodes = E.node_index(g)
    sess = new_session("j", "c", "live", 1, "t")
    sess["profile"] = {"age": 5}
    ids = []
    for _ in range(6):
        res = asyncio.run(E.step(sess, g, nodes, boom))
        if res[0] == "end":
            break
        _, node, _ = res
        ids.append(node["id"])
        E.apply_choice(sess, g, nodes, None, None)
    assert "k" in ids and "b" not in ids


def test_step_unknown_condition_uses_decide():
    g = graph()
    nodes = E.node_index(g)
    nodes["c"] = {"id": "c", "type": "condition", "config": {"field": "intent", "operator": "ai"}}
    sess = new_session("j", "c", "live", 1, "c")

    async def decide(node, profile):
        return "false"

    res = asyncio.run(E.step(sess, g, nodes, decide))
    assert res[0] == "node" and res[1]["id"] == "k"
    assert sess["current_id"] == "k"


def test_apply_choice_payload_merges_profile():
    g = graph()
    sess = new_session("j", "c", "live", 1, "a")
    res = E.apply_choice(sess, g, E.node_index(g), None, {"age": 41})
    assert res[0] == "moved" and sess["profile"]["age"] == 41


def test_terminal_node_without_edges_ends():
    g = {"nodes": [{"id": "a", "type": "text", "config": {}}], "edges": []}
    sess = new_session("j", "c", "live", 1, "a")
    kind, node, choices = asyncio.run(E.step(sess, g, E.node_index(g), boom))
    assert kind == "node" and choices == []
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
    assert E.find_path(g, "a", "a") == ["a"]
    assert E.find_path(g, "a", "b") == ["a", "c", "b"]
    assert E.find_path(g, "e", "a") is None


def test_jump_to_forward():
    g = graph()
    sess = new_session("j", "c", "test", 1, "a")
    kind, _, target = E.jump_to(sess, g, E.node_index(g), "b")
    assert kind == "moved" and target == "b"
    assert sess["current_id"] == "b"


def test_jump_to_unknown_node_unreachable():
    g = graph()
    sess = new_session("j", "c", "test", 1, "a")
    assert E.jump_to(sess, g, E.node_index(g), "zz")[0] == "unreachable"
    assert sess["current_id"] == "a"


def test_jump_to_same_node_noop():
    g = graph()
    sess = new_session("j", "c", "test", 1, "a")
    kind, _, target = E.jump_to(sess, g, E.node_index(g), "a")
    assert kind == "moved" and target == "a"
    assert sess["current_id"] == "a" and sess["history"] == []
