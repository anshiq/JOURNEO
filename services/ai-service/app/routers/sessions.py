import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from app.sessions import protocol
from app.sessions import engine as engine_mod
from app.sessions import spring as spring_mod
from app.sessions import persistence as persist_mod
from app.sessions.store import GraphCache, SessionStore

router = APIRouter(prefix="/v1/sessions", tags=["sessions"])
graph_cache = GraphCache()
sessions = SessionStore()


class ResolveError(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code
        self.message = message


async def decide_branch(journey_id, campaign_id, node, profile):
    from app.graphs.decision_node_graph import decision_graph
    state = {
        "journey_id": journey_id,
        "node_id": node.get("id"),
        "subtype": "evaluate",
        "campaign_id": campaign_id,
        "context": {"profile": profile, "config": node.get("config", {})},
        "attempt": 1,
        "max_attempts": 2,
        "confidence": 0.5,
    }
    res = await decision_graph.ainvoke(state)
    return res.get("branch", "default")


async def resolve_user_query(journey_id, campaign_id, graph, query, screen_id=None):
    from app.graphs.decision_node_graph import decision_graph
    cfg = engine_mod.ask_ai_config(graph, screen_id)
    state = {
        "journey_id": journey_id,
        "node_id": screen_id or "ask_ai",
        "subtype": "query_resolve",
        "campaign_id": campaign_id,
        "context": {"query": query},
        "query": query,
        "journey_graph": graph,
        "config": cfg,
        "attempt": 1,
        "max_attempts": 2,
        "confidence": 0.5,
    }
    res = await decision_graph.ainvoke(state)
    suggested = []
    if cfg.get("allowRag", True):
        try:
            from app.routers.query import suggested_questions
            suggested = suggested_questions(query, k=cfg.get("ragK", 4))
        except Exception:
            suggested = []
    return {
        "decision": res.get("decision", "reject"),
        "branch": res.get("branch", "rejected"),
        "target_node_id": res.get("target_node_id"),
        "target_node_type": res.get("target_node_type"),
        "target_node_summary": res.get("target_node_summary"),
        "target_node_details": res.get("target_node_details"),
        "answer": res.get("answer") or res.get("outcome"),
        "citations": res.get("citations", []),
        "confidence": res.get("confidence", 0.5),
        "reason": res.get("reason", ""),
        "suggested_questions": suggested,
    }


async def resolve_graph(mode, campaign_id, journey_id, dev_token):
    if dev_token:
        try:
            campaign = await spring_mod.fetch_campaign_by_token(dev_token)
        except Exception:
            raise ResolveError("bad-dev-token", "dev link is invalid or has been rotated")
        campaign_id = campaign.get("id")
    if not campaign_id:
        raise ResolveError("missing-campaign", "campaignId or devToken is required")
    try:
        journey_record = await spring_mod.fetch_journey(campaign_id)
    except Exception:
        raise ResolveError("spring-unreachable", "could not load journey from storage")
    journey = spring_mod.pick_journey(journey_record, mode, journey_id)
    if journey is None:
        if mode == "live":
            raise ResolveError("not-live", "campaign is not live yet")
        raise ResolveError("no-journey", "no journey found, save a journey first")
    jid = journey.get("id")
    try:
        version = int(journey.get("version") or 1)
    except (ValueError, TypeError):
        version = 1
    cached = await graph_cache.get(jid)
    if cached is not None and cached[0] == version:
        return campaign_id, journey, version, cached[1]
    graph = spring_mod.parse_graph(journey.get("graphJson"))
    await graph_cache.put(jid, version, graph)
    return campaign_id, journey, version, graph


def screen_frame_payload(sess, graph, screen, blocks, choices, timeout_ms):
    theme = graph.get("theme", {}) if isinstance(graph, dict) else {}
    return protocol.ScreenFrame(
        sessionId=sess["id"],
        graphVersion=sess["graph_version"],
        stepIndex=sess["step_index"],
        screen=engine_mod.screen_payload(screen, theme),
        blocks=[{"nodeId": b.get("nodeId"), "type": b.get("type"), "config": b.get("config", {})} for b in blocks],
        choices=[protocol.ChoiceOption(handle=c["handle"], label=c["label"], source=c.get("source", "advance"), blockId=c.get("blockId")) for c in choices],
        timeoutMs=timeout_ms,
    ).model_dump()


async def serve_current(websocket, sess, graph, nodes, journey_id, campaign_id):
    async def decide(node, profile):
        return await decide_branch(journey_id, campaign_id, node, profile)

    res = await engine_mod.step(sess, graph, nodes, decide)
    if res[0] == "screen":
        _, screen, blocks, choices = res
        block_ids = [b.get("nodeId") for b in blocks]
        await asyncio.to_thread(persist_mod.save_execution, sess["id"], screen.get("id"), block_ids, None, sess["profile"])
        timeout_ms = None
        if len(engine_mod.outgoing(graph, screen.get("id"))) <= 1:
            timeout_ms = engine_mod.screen_timeout_ms(screen)
        await websocket.send_json(screen_frame_payload(sess, graph, screen, blocks, choices, timeout_ms))
        return False, timeout_ms
    await asyncio.to_thread(persist_mod.finish_session, sess["id"], "completed")
    await asyncio.to_thread(persist_mod.save_activity, campaign_id, sess["id"], "session_completed", {"reason": res[1]})
    sess["status"] = "ended"
    await websocket.send_json(protocol.EndFrame(sessionId=sess["id"], reason=res[1]).model_dump())
    return True, None


async def apply_timeout(websocket, sess, graph, nodes, journey_id, campaign_id):
    res = engine_mod.auto_advance(sess, graph, nodes)
    if res[0] == "moved":
        current = sess["current_id"]
        kind, ref = engine_mod.resolve_vertex(graph, current)
        bids = ref.get("blocks", []) if kind == "screen" and isinstance(ref, dict) else []
        await asyncio.to_thread(persist_mod.save_execution, sess["id"], current, bids, "timeout", sess["profile"])
        await asyncio.to_thread(persist_mod.save_activity, campaign_id, sess["id"], "screen:timeout", {"screenId": current})
        return await serve_current(websocket, sess, graph, nodes, journey_id, campaign_id)
    if res[0] == "end":
        await asyncio.to_thread(persist_mod.finish_session, sess["id"], "completed")
        await asyncio.to_thread(persist_mod.save_activity, campaign_id, sess["id"], "session_completed", {"reason": res[1]})
        sess["status"] = "ended"
        await websocket.send_json(protocol.EndFrame(sessionId=sess["id"], reason=res[1]).model_dump())
        return True, None
    return False, None


@router.websocket("/ws")
async def session_ws(websocket: WebSocket):
    await websocket.accept()
    sess = None
    try:
        raw = await websocket.receive_json()
        if not isinstance(raw, dict) or raw.get("type") != "start":
            await websocket.send_json(protocol.ErrorFrame(code="expected-start", message="first frame must be start").model_dump())
            await websocket.close()
            return
        try:
            start = protocol.StartMessage(**raw)
        except Exception:
            await websocket.send_json(protocol.ErrorFrame(code="bad-start", message="invalid start frame").model_dump())
            await websocket.close()
            return
        try:
            campaign_id, journey, version, graph = await resolve_graph(start.mode, start.campaignId, start.journeyId, start.devToken)
        except ResolveError as e:
            await websocket.send_json(protocol.ErrorFrame(code=e.code, message=e.message).model_dump())
            await websocket.close()
            return
        nodes = engine_mod.node_index(graph)
        entry = engine_mod.entry_vertex(graph)
        if entry is None:
            await websocket.send_json(protocol.ErrorFrame(code="empty-graph", message="journey has no screens").model_dump())
            await websocket.close()
            return
        entry_id = entry.get("id") if isinstance(entry, dict) else None
        sess = await sessions.create(journey.get("id"), campaign_id, start.mode, version, entry_id)
        sess["chat"] = []
        if start.device:
            sess["profile"]["device"] = start.device
        await sessions.attach(sess["id"], websocket)
        await asyncio.to_thread(persist_mod.save_session, sess, None)
        await asyncio.to_thread(persist_mod.save_activity, campaign_id, sess["id"], "session_started", {"mode": start.mode, "graphVersion": version})
        ended, current_timeout = await serve_current(websocket, sess, graph, nodes, journey.get("id"), campaign_id)
        if start.resumeThread and sess.get("chat"):
            try:
                await websocket.send_json(protocol.ChatHistoryFrame(sessionId=sess["id"], messages=sess["chat"][-50:]).model_dump())
            except Exception:
                pass
        while True:
            try:
                if current_timeout and not ended:
                    msg = await asyncio.wait_for(websocket.receive_json(), timeout=current_timeout / 1000.0)
                else:
                    msg = await websocket.receive_json()
            except asyncio.TimeoutError:
                ended, current_timeout = await apply_timeout(websocket, sess, graph, nodes, journey.get("id"), campaign_id)
                continue
            if not isinstance(msg, dict):
                continue
            kind = msg.get("type")
            if kind == "timeout" and not ended:
                if msg.get("stepIndex") is not None and msg.get("stepIndex") != sess["step_index"]:
                    continue
                if msg.get("screenId") is not None and msg.get("screenId") != sess["current_id"]:
                    continue
                ended, current_timeout = await apply_timeout(websocket, sess, graph, nodes, journey.get("id"), campaign_id)
            elif kind == "back" and not ended:
                res = engine_mod.go_back(sess)
                if res[0] == "moved":
                    await asyncio.to_thread(persist_mod.save_activity, campaign_id, sess["id"], "screen:back", {"screenId": sess["current_id"]})
                    ended, current_timeout = await serve_current(websocket, sess, graph, nodes, journey.get("id"), campaign_id)
            elif kind == "choice" and not ended:
                res = engine_mod.apply_choice(sess, graph, nodes, msg.get("handle"), msg.get("payload"))
                current = sess["current_id"]
                k2, ref2 = engine_mod.resolve_vertex(graph, current)
                bids2 = ref2.get("blocks", []) if k2 == "screen" and isinstance(ref2, dict) else []
                await asyncio.to_thread(persist_mod.save_execution, sess["id"], current, bids2, msg.get("handle"), sess["profile"])
                await asyncio.to_thread(persist_mod.save_activity, campaign_id, sess["id"], "screen:choice", {"screenId": current, "handle": msg.get("handle")})
                if res[0] == "end":
                    await asyncio.to_thread(persist_mod.finish_session, sess["id"], "completed")
                    sess["status"] = "ended"
                    ended = True
                    current_timeout = None
                    await websocket.send_json(protocol.EndFrame(sessionId=sess["id"], reason=res[1]).model_dump())
                else:
                    ended, current_timeout = await serve_current(websocket, sess, graph, nodes, journey.get("id"), campaign_id)
            elif kind == "goto" and not ended:
                if sess.get("mode") != "test":
                    await websocket.send_json(protocol.ErrorFrame(code="goto-forbidden", message="goto is only available in test mode").model_dump())
                else:
                    try:
                        goto = protocol.GotoMessage(**msg)
                    except Exception:
                        await websocket.send_json(protocol.ErrorFrame(code="bad-goto", message="invalid goto frame").model_dump())
                    else:
                        target = goto.screenId or goto.nodeId
                        if not target:
                            await websocket.send_json(protocol.ErrorFrame(code="bad-goto", message="screenId or nodeId required").model_dump())
                        else:
                            res = engine_mod.jump_to(sess, graph, nodes, target)
                            if res[0] != "moved":
                                await websocket.send_json(protocol.ErrorFrame(code="unreachable-node", message="target screen is not reachable").model_dump())
                            else:
                                current = sess["current_id"]
                                k3, ref3 = engine_mod.resolve_vertex(graph, current)
                                bids3 = ref3.get("blocks", []) if k3 == "screen" and isinstance(ref3, dict) else []
                                await asyncio.to_thread(persist_mod.save_execution, sess["id"], current, bids3, "goto", sess["profile"])
                                await asyncio.to_thread(persist_mod.save_activity, campaign_id, sess["id"], "screen:goto", {"screenId": current})
                                ended, current_timeout = await serve_current(websocket, sess, graph, nodes, journey.get("id"), campaign_id)
            elif kind == "restart":
                entry2 = engine_mod.entry_vertex(graph)
                sess["current_id"] = entry2.get("id") if isinstance(entry2, dict) else entry_id
                sess["profile"] = {}
                sess["history"] = []
                sess["step_index"] = 0
                sess["status"] = "running"
                ended, current_timeout = await serve_current(websocket, sess, graph, nodes, journey.get("id"), campaign_id)
            elif kind == "query" and not ended:
                try:
                    qmsg = protocol.QueryMessage(**msg)
                except Exception:
                    await websocket.send_json(protocol.ErrorFrame(code="bad-query", message="invalid query frame").model_dump())
                else:
                    q = (qmsg.query or "").strip()
                    if not q:
                        await websocket.send_json(protocol.ErrorFrame(code="empty-query", message="query is required").model_dump())
                    else:
                        screen_ctx = qmsg.screenId or qmsg.nodeId or sess["current_id"]
                        out = await resolve_user_query(journey.get("id"), campaign_id, graph, q, screen_ctx)
                        await asyncio.to_thread(persist_mod.save_activity, campaign_id, sess["id"], "screen:query", {"query": q[:300], "decision": out["decision"], "targetNodeId": out.get("target_node_id"), "reason": out.get("reason")})
                        try:
                            sess.setdefault("chat", []).append({"queryId": qmsg.queryId, "query": q, "decision": out["decision"], "answer": out.get("answer"), "screenId": screen_ctx})
                        except Exception:
                            pass
                        await websocket.send_json(protocol.QueryResultFrame(sessionId=sess["id"], queryId=qmsg.queryId, decision=out["decision"], targetNodeId=out.get("target_node_id"), targetNodeType=out.get("target_node_type"), targetNodeSummary=out.get("target_node_summary"), targetNodeDetails=out.get("target_node_details"), answer=out.get("answer"), citations=out.get("citations") or [], confidence=float(out.get("confidence") or 0.5), reason=out.get("reason") or "", suggestedQuestions=out.get("suggested_questions") or []).model_dump())
                        if out["decision"] == "jump" and out.get("target_node_id"):
                            if screen_ctx != sess["current_id"]:
                                pass
                            else:
                                res = engine_mod.jump_to(sess, graph, nodes, out["target_node_id"])
                                if res[0] == "moved":
                                    current = sess["current_id"]
                                    k4, ref4 = engine_mod.resolve_vertex(graph, current)
                                    bids4 = ref4.get("blocks", []) if k4 == "screen" and isinstance(ref4, dict) else []
                                    await asyncio.to_thread(persist_mod.save_execution, sess["id"], current, bids4, "query-jump", sess["profile"])
                                    ended, current_timeout = await serve_current(websocket, sess, graph, nodes, journey.get("id"), campaign_id)
    except WebSocketDisconnect:
        if sess is not None:
            await sessions.detach(sess["id"])
            if sess.get("status") == "running":
                sess["status"] = "abandoned"
                await asyncio.to_thread(persist_mod.finish_session, sess["id"], "abandoned")


@router.post("/graph-changed")
async def graph_changed(body: protocol.GraphChangedWebhook):
    changed = await graph_cache.invalidate(body.journeyId, body.version)
    notified = 0
    if changed:
        for sid, ws in await sessions.test_sockets_for(body.journeyId):
            try:
                await ws.send_json(protocol.StaleFrame(journeyId=body.journeyId, serverVersion=body.version).model_dump())
                notified += 1
            except Exception:
                await sessions.detach(sid)
    return {"ok": True, "invalidated": changed, "notified": notified}


@router.get("/{session_id}")
async def get_session(session_id: str):
    data = await asyncio.to_thread(persist_mod.get_session_with_executions, session_id)
    if data is None:
        raise HTTPException(status_code=404, detail="session not found")
    return data
