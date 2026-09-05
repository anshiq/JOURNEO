from app.sessions import protocol


def test_screen_frame_serialises():
    f = protocol.ScreenFrame(sessionId="s", graphVersion=1, stepIndex=0, screen={"id": "s1"}, blocks=[{"nodeId": "b1", "type": "text", "config": {}}], choices=[protocol.ChoiceOption(handle="default", label="Continue")])
    d = f.model_dump()
    assert d["type"] == "screen"
    assert d["blocks"][0]["nodeId"] == "b1"


def test_query_id_round_trips():
    q = protocol.QueryMessage(queryId="q1", query="hi", screenId="s1")
    assert q.queryId == "q1"
    r = protocol.QueryResultFrame(sessionId="s", queryId="q1", decision="rag", answer="hi")
    assert r.queryId == "q1"


def test_goto_accepts_screen_or_node():
    assert protocol.GotoMessage(screenId="s1").screenId == "s1"
    assert protocol.GotoMessage(nodeId="b1").nodeId == "b1"
