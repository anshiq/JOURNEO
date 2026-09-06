AUTO_TYPES = {"trigger", "condition"}
TERMINAL_TYPES = {"end"}
FLOATING_TYPES = {"ask_ai"}
KNOWN_OPERATORS = {"eq", "neq", "contains", "gt", "lt", "gte", "lte"}


def node_index(graph):
    return {n.get("id"): n for n in graph.get("nodes", []) if n.get("id")}


def outgoing(graph, node_id):
    return [e for e in graph.get("edges", []) if e.get("source") == node_id]


def entry_node(graph):
    nodes = graph.get("nodes", [])
    for n in nodes:
        if n.get("type") == "trigger":
            return n
    for n in nodes:
        if (n.get("type") or "") not in FLOATING_TYPES:
            return n
    return nodes[0] if nodes else None


def match_edge(edges, handle):
    if not edges:
        return None
    if handle:
        for e in edges:
            if e.get("sourceHandle") == handle or e.get("label") == handle:
                return e
    return edges[0]


def edge_handle(edge, index):
    h = edge.get("sourceHandle") or edge.get("label")
    if h:
        return h
    return "default" if index == 0 else f"out-{index}"


def human_label(handle):
    if not handle or handle == "default":
        return "Continue"
    return handle.replace("_", " ").replace("-", " ").strip().capitalize()


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


def jump_to(session, graph, nodes, target_id):
    if target_id not in nodes:
        return ("unreachable", "unknown-node")
    current = session["current_id"]
    if current == target_id:
        return ("moved", [], current)
    target = nodes.get(target_id) or {}
    if (target.get("type") or "") in FLOATING_TYPES:
        session["history"].append({"from": current, "handle": "goto", "to": target_id})
        session["current_id"] = target_id
        session["step_index"] += 1
        return ("moved", [], target_id)
    path = find_path(graph, current, target_id)
    if path is None:
        path = find_path(graph, (entry_node(graph) or {}).get("id"), target_id)
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


async def step(session, graph, nodes, decide):
    depth = 0
    while depth < 50:
        depth += 1
        node = nodes.get(session["current_id"])
        if node is None:
            return ("end", "node-missing")
        ntype = node.get("type")
        if ntype in TERMINAL_TYPES:
            return ("end", "completed")
        if ntype == "trigger":
            edge = match_edge(outgoing(graph, node.get("id")), None)
            if edge is None:
                return ("end", "completed")
            move(session, edge, None)
            continue
        if ntype == "condition":
            branch = local_branch(node.get("config", {}), session["profile"])
            if branch is None:
                branch = await decide(node, dict(session["profile"]))
            edge = match_edge(outgoing(graph, node.get("id")), branch)
            if edge is None:
                return ("end", "no-branch")
            move(session, edge, branch)
            continue
        outs = outgoing(graph, node.get("id"))
        choices = [{"handle": edge_handle(e, i), "label": human_label(edge_handle(e, i))} for i, e in enumerate(outs)]
        return ("node", node, choices)
    return ("end", "max-depth")


def apply_choice(session, graph, nodes, handle, payload):
    if isinstance(payload, dict):
        session["profile"].update(payload)
    node = nodes.get(session["current_id"])
    if node is None:
        return ("end", "node-missing")
    edge = match_edge(outgoing(graph, node.get("id")), handle)
    if edge is None:
        return ("end", "completed")
    move(session, edge, handle)
    return ("moved", edge, handle)


def find_ask_ai_node(graph):
    for n in graph.get("nodes", []):
        if isinstance(n, dict) and n.get("type") == "ask_ai":
            return n
    return None


def ask_ai_config(graph, node_id=None):
    nodes = graph.get("nodes", []) if isinstance(graph, dict) else []
    if node_id:
        for n in nodes:
            if isinstance(n, dict) and n.get("id") == node_id and n.get("type") == "ask_ai":
                cfg = n.get("config")
                return cfg if isinstance(cfg, dict) else {}
    node = find_ask_ai_node(graph)
    if node is None:
        return {}
    cfg = node.get("config")
    return cfg if isinstance(cfg, dict) else {}
