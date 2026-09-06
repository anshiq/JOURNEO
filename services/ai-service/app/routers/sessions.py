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


async def resolve_user_query(journey_id, campaign_id, graph, query, node_id=None):
    from app.graphs.decision_node_graph import decision_graph
    cfg = engine_mod.ask_ai_config(graph, node_id)
    state = {
        "journey_id": journey_id,
        "node_id": node_id or "ask_ai",
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
        journeys = await spring_mod.fetch_journeys(campaign_id)
    except Exception:
        raise ResolveError("spring-unreachable", "could not load journeys from storage")
    journey = spring_mod.pick_journey(journeys, mode, journey_id)
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


def node_payload(node):
    cfg = node.get("config")
    if not isinstance(cfg, dict):
        cfg = {}
    return {"id": node.get("id"), "type": node.get("type"), "config": cfg}


async def serve_current(websocket, sess, graph, nodes, journey_id, campaign_id):
    async def decide(node, profile):
        return await decide_branch(journey_id, campaign_id, node, profile)

    res = await engine_mod.step(sess, graph, nodes, decide)
    if res[0] == "node":
        _, node, choices = res
        await asyncio.to_thread(persist_mod.save_execution, sess["id"], node.get("id"), node.get("type"), None, sess["profile"])
        await websocket.send_json(protocol.NodeFrame(sessionId=sess["id"], graphVersion=sess["graph_version"], stepIndex=sess["step_index"], node=node_payload(node), choices=[protocol.ChoiceOption(handle=c["handle"], label=c["label"]) for c in choices]).model_dump())
        return False
    await asyncio.to_thread(persist_mod.finish_session, sess["id"], "completed")
    await asyncio.to_thread(persist_mod.save_activity, campaign_id, sess["id"], "session_completed", {"reason": res[1]})
    sess["status"] = "ended"
    await websocket.send_json(protocol.EndFrame(sessionId=sess["id"], reason=res[1]).model_dump())
    return True


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
        entry = engine_mod.entry_node(graph)
        if entry is None:
            await websocket.send_json(protocol.ErrorFrame(code="empty-graph", message="journey has no nodes").model_dump())
            await websocket.close()
            return
        sess = await sessions.create(journey.get("id"), campaign_id, start.mode, version, entry.get("id"))
        await sessions.attach(sess["id"], websocket)
        await asyncio.to_thread(persist_mod.save_session, sess, None)
        await asyncio.to_thread(persist_mod.save_activity, campaign_id, sess["id"], "session_started", {"mode": start.mode, "graphVersion": version})
        ended = await serve_current(websocket, sess, graph, nodes, journey.get("id"), campaign_id)
        while True:
            msg = await websocket.receive_json()
            if not isinstance(msg, dict):
                continue
            kind = msg.get("type")
            if kind == "choice" and not ended:
                res = engine_mod.apply_choice(sess, graph, nodes, msg.get("handle"), msg.get("payload"))
                await asyncio.to_thread(persist_mod.save_execution, sess["id"], sess["current_id"], (nodes.get(sess["current_id"]) or {}).get("type"), msg.get("handle"), sess["profile"])
                await asyncio.to_thread(persist_mod.save_activity, campaign_id, sess["id"], "node:choice", {"nodeId": sess["current_id"], "handle": msg.get("handle")})
                if res[0] == "end":
                    await asyncio.to_thread(persist_mod.finish_session, sess["id"], "completed")
                    sess["status"] = "ended"
                    ended = True
                    await websocket.send_json(protocol.EndFrame(sessionId=sess["id"], reason=res[1]).model_dump())
                else:
                    ended = await serve_current(websocket, sess, graph, nodes, journey.get("id"), campaign_id)
            elif kind == "goto" and not ended:
                if sess.get("mode") != "test":
                    await websocket.send_json(protocol.ErrorFrame(code="goto-forbidden", message="goto is only available in test mode").model_dump())
                else:
                    try:
                        goto = protocol.GotoMessage(**msg)
                    except Exception:
                        await websocket.send_json(protocol.ErrorFrame(code="bad-goto", message="invalid goto frame").model_dump())
                    else:
                        target_node = nodes.get(goto.nodeId) or {}
                        if (target_node.get("type") or "") in engine_mod.FLOATING_TYPES:
                            await asyncio.to_thread(persist_mod.save_activity, campaign_id, sess["id"], "node:goto-floating", {"nodeId": goto.nodeId})
                            ended = await serve_current(websocket, sess, graph, nodes, journey.get("id"), campaign_id)
                        else:
                            res = engine_mod.jump_to(sess, graph, nodes, goto.nodeId)
                            if res[0] != "moved":
                                await websocket.send_json(protocol.ErrorFrame(code="unreachable-node", message="target node is not reachable").model_dump())
                            else:
                                await asyncio.to_thread(persist_mod.save_execution, sess["id"], sess["current_id"], (nodes.get(sess["current_id"]) or {}).get("type"), "goto", sess["profile"])
                                await asyncio.to_thread(persist_mod.save_activity, campaign_id, sess["id"], "node:goto", {"nodeId": sess["current_id"]})
                                ended = await serve_current(websocket, sess, graph, nodes, journey.get("id"), campaign_id)
            elif kind == "restart":
                sess["current_id"] = entry.get("id")
                sess["profile"] = {}
                sess["history"] = []
                sess["step_index"] = 0
                sess["status"] = "running"
                ended = await serve_current(websocket, sess, graph, nodes, journey.get("id"), campaign_id)
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
                        out = await resolve_user_query(journey.get("id"), campaign_id, graph, q, qmsg.nodeId)
                        await asyncio.to_thread(persist_mod.save_activity, campaign_id, sess["id"], "node:query", {"query": q[:300], "decision": out["decision"], "targetNodeId": out.get("target_node_id"), "reason": out.get("reason")})
                        await websocket.send_json(protocol.QueryResultFrame(sessionId=sess["id"], decision=out["decision"], targetNodeId=out.get("target_node_id"), targetNodeType=out.get("target_node_type"), targetNodeSummary=out.get("target_node_summary"), targetNodeDetails=out.get("target_node_details"), answer=out.get("answer"), citations=out.get("citations") or [], confidence=float(out.get("confidence") or 0.5), reason=out.get("reason") or "").model_dump())
                        if out["decision"] == "jump" and out.get("target_node_id"):
                            res = engine_mod.jump_to(sess, graph, nodes, out["target_node_id"])
                            if res[0] == "moved":
                                await asyncio.to_thread(persist_mod.save_execution, sess["id"], sess["current_id"], (nodes.get(sess["current_id"]) or {}).get("type"), "query-jump", sess["profile"])
                                ended = await serve_current(websocket, sess, graph, nodes, journey.get("id"), campaign_id)
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
