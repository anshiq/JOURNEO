KNOWN_OPERATORS = {"eq", "neq", "contains", "gt", "lt", "gte", "lte"}
MAX_TIMEOUT_MS = 86400 * 1000
FLOW_TYPES = {"trigger", "condition", "end"}


def node_index(graph):
    return {n.get("id"): n for n in graph.get("nodes", []) if n.get("id")}


def screen_index(graph):
    return {s.get("id"): s for s in graph.get("screens", []) if s.get("id")}


def block_owner(graph):
    m = {}
    for s in graph.get("screens", []):
        for b in s.get("blocks", []) or []:
            m[b] = s.get("id")
    return m


def vertex_index(graph):
    v = {}
    for s in graph.get("screens", []):
        if s.get("id"):
            v[s["id"]] = {"kind": "screen", "ref": s}
    for n in graph.get("nodes", []):
        if n.get("type") in FLOW_TYPES and n.get("id"):
            v[n["id"]] = {"kind": "flow", "ref": n}
    return v


def outgoing(graph, vertex_id):
    return [e for e in graph.get("edges", []) if e.get("source") == vertex_id]


def entry_vertex(graph):
    nodes = graph.get("nodes", [])
    for n in nodes:
        if n.get("type") == "trigger":
            outs = outgoing(graph, n.get("id"))
            if outs:
                return nodes_index_target(graph, outs[0].get("target")) or outs[0]
            return None
    screens = graph.get("screens", [])
    return screens[0] if screens else None


def nodes_index_target(graph, vid):
    for s in graph.get("screens", []):
        if s.get("id") == vid:
            return s
    for n in graph.get("nodes", []):
        if n.get("id") == vid:
            return n
    return None


def screen_timeout_ms(screen):
    if not isinstance(screen, dict):
        return None
    raw = screen.get("timeoutSeconds")
    if raw is None:
        return None
    try:
        val = float(raw) * 1000.0
    except (ValueError, TypeError):
        return None
    if val <= 0 or val > MAX_TIMEOUT_MS:
        return None
    return int(val)


def registry_handles(ntype, config=None):
    if ntype == "condition":
        return ["true", "false"]
    if ntype == "quiz":
        return ["answered", "skipped"]
    if ntype == "video":
        return ["watched", "skipped"]
    if ntype == "card":
        cfg = config if isinstance(config, dict) else {}
        acts = cfg.get("actions")
        if isinstance(acts, list) and acts:
            out = []
            for i, a in enumerate(acts):
                if isinstance(a, dict) and a.get("handle"):
                    out.append(str(a["handle"]))
                else:
                    out.append(f"action-{i}")
            return out
        return ["default"]
    if ntype == "hero_section":
        cfg = config if isinstance(config, dict) else {}
        ctas = cfg.get("ctas")
        if isinstance(ctas, list) and ctas:
            out = []
            for i, c in enumerate(ctas):
                if isinstance(c, dict) and c.get("handle"):
                    out.append(str(c["handle"]))
                else:
                    out.append(f"cta-{i}")
            return out
        return ["default"]
    return ["default"]


def edge_handle(edge, index):
    h = edge.get("sourceHandle") or edge.get("label")
    if h:
        return h
    return "default" if index == 0 else f"out-{index}"


def human_label(handle):
    if not handle or handle == "default":
        return "Continue"
    tail = handle.split(":")[-1] if ":" in handle else handle
    if not tail or tail == "default":
        return "Continue"
    return tail.replace("_", " ").replace("-", " ").strip().capitalize()


def screen_exits(graph, screen):
    outs = outgoing(graph, screen.get("id"))
    by_handle = {}
    for e in outs:
        by_handle[e.get("sourceHandle") or "default"] = e
    exits = []
    nodes = node_index(graph)
    adv = screen.get("advance") or {}
    mode = adv.get("mode", "button")
    if mode in ("button", "auto"):
        h = adv.get("handle") or "default"
        if h in by_handle:
            exits.append({"handle": h, "label": (by_handle[h].get("label") or human_label(h)), "source": "advance"})
    for bid in screen.get("blocks", []) or []:
        n = nodes.get(bid)
        if not n:
            continue
        cfg = n.get("config") or {}
        if not cfg.get("blockOwnsExit"):
            continue
        for h in registry_handles(n.get("type"), cfg):
            namespaced = f"{bid}:{h}"
            if namespaced in by_handle:
                e = by_handle[namespaced]
                exits.append({"handle": namespaced, "label": (e.get("label") or human_label(h)), "source": "block", "blockId": bid})
    return exits


def screen_payload(screen, theme, ask_ai=None):
    merged = dict(theme or {})
    st = screen.get("theme")
    if isinstance(st, dict):
        for k, v in st.items():
            if v is not None:
                merged[k] = v
    adv = screen.get("advance") or {}
    if not adv.get("handle"):
        adv = {**adv, "handle": "default"}
    fixture = ask_ai if isinstance(ask_ai, dict) else None
    return {
        "id": screen.get("id"),
        "name": screen.get("name", ""),
        "layout": screen.get("layout", {}),
        "theme": merged,
        "style": screen.get("style"),
        "advance": adv,
        "back": screen.get("back", {"show": False, "label": "Back"}),
        "askAi": screen.get("askAi"),
        "askAiFixture": fixture,
    }


def block_payload(node):
    cfg = node.get("config")
    if not isinstance(cfg, dict):
        cfg = {}
    return {"nodeId": node.get("id"), "type": node.get("type"), "config": cfg}


def eval_operator(pv, op, val):
    vs = "" if val is None else str(val)
    if op == "eq":
        return pv == vs
    if op == "neq":
        return pv != vs
    if op == "contains":
        return vs in pv
    try:
        a = float(pv)
        b = float(vs)
    except (ValueError, TypeError):
        return False
    if op == "gt":
        return a > b
    if op == "lt":
        return a < b
    if op == "gte":
        return a >= b
    if op == "lte":
        return a <= b
    return False


def local_branch(config, profile):
    field = config.get("field")
    op = config.get("operator")
    if not field or op not in KNOWN_OPERATORS:
        return None
    pv = profile.get(field, "")
    branch = "true" if eval_operator(str(pv), op, config.get("value")) else "false"
    return branch


def move(session, edge, handle):
    session["history"].append({"from": session["current_id"], "handle": handle, "to": edge.get("target")})
    session["current_id"] = edge.get("target")
    session["step_index"] += 1


def find_path(graph, start_id, target_id):
    if start_id == target_id:
        return [start_id]
    adjacency = {}
    for e in graph.get("edges", []):
        adjacency.setdefault(e.get("source"), []).append(e)
    queue = [[start_id]]
    visited = {start_id}
    while queue:
        path = queue.pop(0)
        last = path[-1]
        for e in adjacency.get(last, []):
            nxt = e.get("target")
            if nxt in visited:
                continue
            visited.add(nxt)
            next_path = path + [nxt]
            if nxt == target_id:
                return next_path
            queue.append(next_path)
    return None


def resolve_vertex(graph, vid):
    for s in graph.get("screens", []):
        if s.get("id") == vid:
            return ("screen", s)
    for n in graph.get("nodes", []):
        if n.get("id") == vid:
            return ("flow", n)
    return (None, None)


def jump_to(session, graph, nodes, target_id):
    owner = block_owner(graph)
    if target_id in owner:
        target_id = owner[target_id]
    verts = vertex_index(graph)
    if target_id not in verts:
        return ("unreachable", "unknown-node")
    current = session["current_id"]
    if current == target_id:
        return ("moved", [], current)
    path = find_path(graph, current, target_id)
    if path is None:
        ent = entry_vertex(graph)
        ent_id = ent.get("id") if isinstance(ent, dict) else None
        if ent_id:
            path = find_path(graph, ent_id, target_id)
        if path is None:
            return ("unreachable", "no-path")
        session["history"].append({"from": current, "handle": "goto", "to": path[0]})
        session["current_id"] = path[0]
    edges = []
    for i in range(len(path) - 1):
        edge = match_edge(outgoing(graph, path[i]), None)
        nxt = path[i + 1]
        for e in outgoing(graph, path[i]):
            if e.get("target") == nxt:
                edge = e
                break
        if edge is None:
            return ("unreachable", "no-path")
        edges.append(edge)
        move(session, edge, edge.get("sourceHandle"))
    return ("moved", edges, target_id)


def match_edge(edges, handle):
    if not edges:
        return None
    if handle:
        for e in edges:
            if e.get("sourceHandle") == handle or e.get("label") == handle:
                return e
    return edges[0]


def auto_advance(session, graph, nodes):
    current = nodes_index_target(graph, session["current_id"])
    if current is None:
        return ("end", "screen-missing")
    outs = outgoing(graph, session["current_id"])
    if len(outs) == 0:
        session["history"].append({"from": session["current_id"], "handle": "timeout", "to": None})
        session["step_index"] += 1
        return ("end", "timeout")
    if len(outs) > 1:
        return ("skip", "multiple-edges")
    edge = outs[0]
    if isinstance(current, dict) and current.get("id") in screen_index(graph):
        handle = (current.get("advance") or {}).get("handle") or "default"
        selected = match_edge(outs, handle)
        if selected is not None: edge = selected
    move(session, edge, edge.get("sourceHandle") or "default")
    return ("moved", edge, edge.get("sourceHandle"))


def go_back(session):
    hist = session.get("history") or []
    if not hist:
        return ("noop", "at-start")
    last = hist.pop()
    session["current_id"] = last.get("from")
    session["step_index"] = max(0, session.get("step_index", 1) - 1)
    return ("moved", session["current_id"])


async def step(session, graph, nodes, decide):
    depth = 0
    while depth < 50:
        depth += 1
        kind, ref = resolve_vertex(graph, session["current_id"])
        if ref is None:
            return ("end", "screen-missing")
        if kind == "flow":
            ntype = ref.get("type")
            if ntype == "end":
                return ("end", "completed")
            if ntype == "trigger":
                edge = match_edge(outgoing(graph, ref.get("id")), None)
                if edge is None:
                    return ("end", "completed")
                move(session, edge, None)
                continue
            if ntype == "condition":
                branch = local_branch(ref.get("config", {}), session["profile"])
                if branch is None:
                    branch = await decide(ref, dict(session["profile"]))
                edge = match_edge(outgoing(graph, ref.get("id")), branch)
                if edge is None:
                    return ("end", "no-branch")
                move(session, edge, branch)
                continue
            return ("end", "unknown-flow")
        screens = screen_index(graph)
        screen = screens.get(session["current_id"])
        if screen is None:
            return ("end", "screen-missing")
        outs = outgoing(graph, screen.get("id"))
        choices = []
        for c in screen_exits(graph, screen):
            choices.append(c)
        if not choices:
            for i, e in enumerate(outs):
                h = edge_handle(e, i)
                choices.append({"handle": h, "label": (e.get("label") or human_label(h)), "source": "advance"})
            if not choices:
                return ("end", "completed")
        blocks = []
        for bid in screen.get("blocks", []) or []:
            n = nodes.get(bid)
            if n is not None:
                blocks.append(block_payload(n))
        return ("screen", screen, blocks, choices)
    return ("end", "max-depth")


def apply_choice(session, graph, nodes, handle, payload):
    if isinstance(payload, dict):
        session["profile"].update(payload)
    current = session["current_id"]
    edge = match_edge(outgoing(graph, current), handle)
    if edge is None:
        return ("end", "completed")
    move(session, edge, handle)
    return ("moved", edge, handle)


def ask_ai_config(graph, screen_id=None):
    fixture = graph.get("askAi") if isinstance(graph, dict) else None
    if isinstance(fixture, dict):
        return fixture
    return {}
