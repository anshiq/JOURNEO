import copy
import json

FLOW_TYPES = {"trigger", "condition", "end"}
FLOATING_TYPES = {"ask_ai"}
VALUE_TYPES = {"input", "select", "checkbox", "rating"}
KNOWN_TYPES = {"trigger", "condition", "end", "text", "image", "video", "button", "input", "select", "checkbox", "rating", "divider", "card", "hero_section", "quiz", "form", "countdown", "alert", "badge", "ask_ai"}
OPERATORS = {"eq", "neq", "contains", "gt", "lt", "gte", "lte"}
class BadGraphException(Exception):
    pass
def serialize(graph):
    if not isinstance(graph, dict):
        raise BadGraphException("graph must be an object")
    for k in ("screens", "nodes", "edges"):
        if not isinstance(graph.get(k), list):
            raise BadGraphException(f"graph.{k} must be an array")
    return json.dumps(graph)
def _strip_style(root):
    clone = copy.deepcopy(root)
    if not isinstance(clone, dict):
        return clone
    clone.pop("theme", None)
    nodes = clone.get("nodes")
    if isinstance(nodes, list):
        for n in nodes:
            if isinstance(n, dict) and isinstance(n.get("config"), dict):
                n["config"].pop("style", None)
                n["config"].pop("theme", None)
    screens = clone.get("screens")
    if isinstance(screens, list):
        for s in screens:
            if isinstance(s, dict):
                s.pop("style", None)
                s.pop("theme", None)
    return clone
def is_style_only_diff(old_json, new_json):
    if not old_json or not new_json:
        return False
    try:
        return _strip_style(json.loads(old_json)) == _strip_style(json.loads(new_json))
    except Exception:
        return False
def _err(node_id, field, message, severity="error"):
    return {"nodeId": node_id, "field": field, "message": message, "severity": severity}
def validate(graph_json):
    errors = []
    if not graph_json or not str(graph_json).strip():
        return [_err("graph", "schemaVersion", "Unsupported graph schema, rebuild the journey")]
    try:
        root = json.loads(graph_json)
        if not isinstance(root, dict) or root.get("schemaVersion") != 3:
            return [_err("graph", "schemaVersion", "Unsupported graph schema, rebuild the journey")]
        nodes = root.get("nodes")
        screens = root.get("screens")
        edges = root.get("edges")
        if not isinstance(nodes, list):
            errors.append(_err("graph", "nodes", "graph.nodes must be an array"))
        if not isinstance(screens, list):
            errors.append(_err("graph", "screens", "graph.screens must be an array"))
        if not isinstance(edges, list):
            errors.append(_err("graph", "edges", "graph.edges must be an array"))
        if errors:
            return errors
        node_by_id = {}
        screen_by_id = {}
        owner_by_block = {}
        vertex_ids = set()
        trigger_ids = []
        for node in nodes:
            nid = (node.get("id") or "") if isinstance(node, dict) else ""
            ntype = (node.get("type") or "") if isinstance(node, dict) else ""
            if not nid:
                errors.append(_err("graph", "nodes", "Every node requires an id"))
            if nid in node_by_id:
                errors.append(_err(nid, "id", "Duplicate node id"))
            node_by_id[nid] = node
            if ntype not in KNOWN_TYPES:
                errors.append(_err(nid, "type", f"Unknown node type: {ntype}"))
            if ntype == "trigger":
                trigger_ids.append(nid)
            if ntype in FLOW_TYPES:
                vertex_ids.add(nid)
            cfg = node.get("config", {}) if isinstance(node, dict) else {}
            if not isinstance(cfg, dict):
                cfg = {}
            _validate_node_config(errors, nid, ntype, cfg)
            if ntype in VALUE_TYPES and not str(cfg.get("blockKey") or "").strip():
                errors.append(_err(nid, "config.blockKey", f"{ntype} requires blockKey"))
        for screen in screens:
            sid = screen.get("id", "") if isinstance(screen, dict) else ""
            if not sid:
                errors.append(_err("graph", "screens", "Every screen requires an id"))
            if sid in screen_by_id:
                errors.append(_err(sid, "id", "Duplicate screen id"))
            screen_by_id[sid] = screen
            vertex_ids.add(sid)
            blocks = screen.get("blocks") if isinstance(screen, dict) else None
            if not isinstance(blocks, list):
                errors.append(_err(sid, "blocks", "Screen blocks must be an array"))
                continue
            if not blocks:
                errors.append(_err(sid, "blocks", "Screen has no blocks"))
            block_keys = set()
            for bid in blocks:
                prev = owner_by_block.get(bid)
                if prev is not None:
                    errors.append(_err(bid, "blocks", "Block belongs to multiple screens"))
                else:
                    owner_by_block[bid] = sid
                block = node_by_id.get(bid)
                if block is None:
                    errors.append(_err(sid, "blocks", f"Screen references missing block {bid}"))
                    continue
                if block.get("type") in FLOW_TYPES:
                    errors.append(_err(bid, "blocks", "Flow node cannot be inside a screen"))
                key = ""
                if isinstance(block.get("config"), dict):
                    key = str(block["config"].get("blockKey") or "")
                if key and key in block_keys:
                    errors.append(_err(bid, "config.blockKey", "Duplicate blockKey in screen"))
                elif key:
                    block_keys.add(key)
            _validate_screen(errors, screen, blocks, node_by_id, screen_by_id, edges)
        for nid, node in node_by_id.items():
            if node.get("type") not in FLOW_TYPES and node.get("type") not in FLOATING_TYPES and nid not in owner_by_block:
                errors.append(_err(nid, "blocks", "Renderable block is not in any screen"))
        if len(trigger_ids) != 1:
            errors.append(_err("graph", "trigger", f"Exactly one trigger required, found {len(trigger_ids)}"))
        adjacency = {}
        for edge in edges:
            if not isinstance(edge, dict):
                continue
            src = edge.get("source", "")
            tgt = edge.get("target", "")
            eid = edge.get("id", "edge")
            if src not in vertex_ids or tgt not in vertex_ids:
                errors.append(_err(eid, "edges", "Edge references missing vertex"))
            adjacency.setdefault(src, []).append(edge)
            handle = str(edge.get("sourceHandle") or "")
            if ":" in handle:
                block_id = handle.split(":")[0]
                src_screen = screen_by_id.get(src)
                blks = src_screen.get("blocks", []) if isinstance(src_screen, dict) else []
                if src_screen is None or block_id not in blks:
                    errors.append(_err(eid, "edges", "Edge handle references block outside source screen"))
        if len(trigger_ids) == 1:
            visited = _reachable(trigger_ids[0], adjacency, vertex_ids)
            for sid in screen_by_id:
                if sid not in visited:
                    errors.append(_err(sid, "graph", "Unreachable screen"))
            if _has_cycle(adjacency, vertex_ids):
                errors.append(_err("graph", "edges", "Cycle detected outside subflow boundary"))
    except Exception as e:
        errors.append(_err("graph", "json", f"Invalid JSON: {e}"))
    return errors
def _validate_node_config(errors, nid, ntype, cfg):
    if ntype == "condition":
        if not str(cfg.get("field") or "").strip():
            errors.append(_err(nid, "config.field", "Condition node requires field"))
        branches = cfg.get("branches")
        if isinstance(branches, list) and branches:
            for br in branches:
                if not str((br or {}).get("handle") or "").strip():
                    errors.append(_err(nid, "config.branches", "Each branch requires a handle"))
                op = str((br or {}).get("operator") or "")
                if op and op not in OPERATORS:
                    errors.append(_err(nid, "config.branches", "Branch operator must be valid"))
        elif str(cfg.get("operator") or "") not in OPERATORS:
            errors.append(_err(nid, "config.operator", "Condition requires a valid operator"))
    elif ntype == "image" and not str(cfg.get("src") or "").strip():
        errors.append(_err(nid, "config.src", "image requires src"))
    elif ntype == "button" and not str(cfg.get("label") or "").strip():
        errors.append(_err(nid, "config.label", "button requires label"))
    elif ntype == "select" and (not isinstance(cfg.get("options"), list) or not cfg.get("options")):
        errors.append(_err(nid, "config.options", "select requires at least 1 option"))
    elif ntype == "hero_section" and not str(cfg.get("headline") or "").strip():
        errors.append(_err(nid, "config.headline", "hero_section requires headline"))
    elif ntype == "quiz" and not str(cfg.get("question") or "").strip():
        errors.append(_err(nid, "config.question", "quiz requires question"))
    elif ntype == "quiz" and (not isinstance(cfg.get("options"), list) or not cfg.get("options")):
        errors.append(_err(nid, "config.options", "quiz requires at least 1 option"))
    elif ntype == "form" and (not isinstance(cfg.get("fields"), list) or not cfg.get("fields")):
        errors.append(_err(nid, "config.fields", "form requires at least one field"))
    elif ntype == "countdown" and not str(cfg.get("endTime") or "").strip():
        errors.append(_err(nid, "config.endTime", "countdown requires endTime"))
    elif ntype == "alert" and not str(cfg.get("message") or "").strip():
        errors.append(_err(nid, "config.message", "alert requires message"))
    elif ntype == "badge" and not str(cfg.get("label") or "").strip():
        errors.append(_err(nid, "config.label", "badge requires label"))
def _validate_screen(errors, screen, blocks, node_by_id, screen_by_id, edges):
    sid = screen.get("id", "")
    adv = screen.get("advance", {}) if isinstance(screen.get("advance"), dict) else {}
    mode = adv.get("mode", "button")
    has_owned_exit = False
    for bid in blocks or []:
        b = node_by_id.get(bid)
        if isinstance(b, dict) and isinstance(b.get("config"), dict) and b["config"].get("blockOwnsExit"):
            has_owned_exit = True
    if mode == "button" and screen_by_id:
        outgoing = any(isinstance(e, dict) and e.get("source") == sid for e in edges or [])
        if not outgoing:
            errors.append(_err(sid, "advance.mode", "Button advance requires an outgoing edge"))
    if mode == "block" and not has_owned_exit:
        errors.append(_err(sid, "advance.mode", "Block advance requires a block with blockOwnsExit"))
    if mode == "none":
        for e in edges or []:
            if isinstance(e, dict) and e.get("source") == sid:
                errors.append(_err(sid, "advance.mode", "Advance mode none should not have outgoing edges", "warning"))
                break
    req = adv.get("requireBlocks")
    if isinstance(req, list):
        for entry in req:
            if entry not in (blocks or []):
                errors.append(_err(sid, "advance.requireBlocks", f"requireBlocks references missing block {entry}"))
            else:
                nb = node_by_id.get(entry, {})
                cfg = nb.get("config", {}) if isinstance(nb, dict) else {}
                if not str((cfg or {}).get("blockKey") or "").strip():
                    errors.append(_err(sid, "advance.requireBlocks", "requireBlocks entry has no blockKey"))
def _reachable(start, adjacency, vertices):
    visited = {start}
    queue = [start]
    while queue:
        cur = queue.pop(0)
        for e in adjacency.get(cur, []):
            tgt = e.get("target", "")
            if tgt in vertices and tgt not in visited:
                visited.add(tgt)
                queue.append(tgt)
    return visited
def _has_cycle(adjacency, vertices):
    state = {v: 0 for v in vertices}
    def visit(cur):
        state[cur] = 1
        for e in adjacency.get(cur, []):
            tgt = e.get("target", "")
            if tgt not in state:
                continue
            if state[tgt] == 1 or (state[tgt] == 0 and visit(tgt)):
                return True
        state[cur] = 2
        return False
    for v in vertices:
        if state[v] == 0 and visit(v):
            return True
    return False
