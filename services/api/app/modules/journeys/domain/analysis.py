from collections import deque
from dataclasses import dataclass, field
from typing import Any

from app.modules.journeys.domain.ports import Port, ports_of, screen_outputs
from app.modules.journeys.domain.targets import resolve_target

INFINITY = 10**9


@dataclass(slots=True)
class DocIndex:
    doc: Any
    kinds: dict[str, str] = field(default_factory=dict)
    ports: dict[str, list[Port]] = field(default_factory=dict)
    adjacency: dict[str, list[tuple[str, str]]] = field(default_factory=dict)
    reachable: set[str] = field(default_factory=set)
    produced: dict[str, set[str]] = field(default_factory=dict)
    may: dict[str, set[str]] = field(default_factory=dict)
    must: dict[str, set[str]] = field(default_factory=dict)
    min_to_end: dict[str, int] = field(default_factory=dict)
    sccs: list[list[str]] = field(default_factory=list)
    has_reachable_cycle: bool = False
    first_step: str = ""
    order: dict[str, int] = field(default_factory=dict)

    def target(self, step_id: str, port: str) -> str | None:
        return resolve_target(self.doc, step_id, port)

    def first_screen(self) -> str | None:
        current = self.target(self.first_step, "next") if self.first_step else None
        seen: set[str] = set()
        while current and current not in seen:
            seen.add(current)
            kind = self.kinds.get(current)
            if kind == "screen":
                return current
            if kind != "condition":
                return None
            current = self.target(current, "else") or next((t for _, t in self.adjacency.get(current, [])), None)
        return None


def build_index(doc: Any) -> DocIndex:
    index = DocIndex(doc=doc)
    index.kinds = {s.id: s.kind for s in doc.steps}
    start = next((s for s in doc.steps if s.kind == "start"), None)
    index.first_step = start.id if start else ""
    for step in doc.steps:
        ports = ports_of(doc, step.id)
        index.ports[step.id] = ports
        edges: list[tuple[str, str]] = []
        for port in ports:
            target = resolve_target(doc, step.id, port.port)
            if target and target in index.kinds:
                edges.append((port.port, target))
        index.adjacency[step.id] = edges
    index.reachable = _reachable(index)
    for step in doc.steps:
        screen = doc.screens.get(step.id) if step.kind == "screen" else None
        index.produced[step.id] = {o.key for o in screen_outputs(screen)} if screen is not None else set()
    _availability(index)
    index.min_to_end = _distances(index)
    index.sccs = _tarjan(index)
    index.has_reachable_cycle = any(
        (len(c) > 1 or _self_loop(index, c[0])) and c[0] in index.reachable for c in index.sccs
    )
    index.order = _outline_order(index)
    return index


def _reachable(index: DocIndex) -> set[str]:
    seen: set[str] = set()
    queue = deque([index.first_step] if index.first_step else [])
    while queue:
        cur = queue.popleft()
        if cur in seen:
            continue
        seen.add(cur)
        queue.extend(t for _, t in index.adjacency.get(cur, []) if t not in seen)
    return seen


def _availability(index: DocIndex) -> None:
    preds: dict[str, list[str]] = {sid: [] for sid in index.kinds}
    for src, edges in index.adjacency.items():
        for _, tgt in edges:
            preds[tgt].append(src)
    may: dict[str, set[str]] = {sid: set() for sid in index.kinds}
    must: dict[str, set[str] | None] = {sid: None for sid in index.kinds}
    if index.first_step:
        must[index.first_step] = set()
    work = deque(sid for sid in index.kinds if sid in index.reachable)
    queued = set(work)
    while work:
        sid = work.popleft()
        queued.discard(sid)
        if sid == index.first_step:
            continue
        incoming = [p for p in preds[sid] if p in index.reachable]
        if not incoming:
            continue
        union: set[str] = set()
        inter: set[str] | None = None
        for p in incoming:
            union |= may[p] | index.produced[p]
            prior = must[p]
            if prior is None:
                continue
            cand = prior | index.produced[p]
            inter = set(cand) if inter is None else inter & cand
        changed = False
        if union != may[sid]:
            may[sid] = union
            changed = True
        if inter is not None and inter != must[sid]:
            must[sid] = inter
            changed = True
        if changed:
            for _, nxt in index.adjacency.get(sid, []):
                if nxt not in queued:
                    work.append(nxt)
                    queued.add(nxt)
    index.may = may
    index.must = {k: (v if v is not None else set()) for k, v in must.items()}


def _distances(index: DocIndex) -> dict[str, int]:
    dist = {sid: INFINITY for sid in index.kinds}
    rev: dict[str, list[str]] = {sid: [] for sid in index.kinds}
    for src, edges in index.adjacency.items():
        for _, tgt in edges:
            rev[tgt].append(src)
    frontier: list[str] = []
    for sid, kind in index.kinds.items():
        if not index.adjacency.get(sid) and kind in ("screen", "redirect"):
            dist[sid] = 1 if kind == "screen" else 0
            frontier.append(sid)
    done: set[str] = set()
    while frontier:
        frontier.sort(key=lambda s: dist[s])
        cur = frontier.pop(0)
        if cur in done:
            continue
        done.add(cur)
        for prev in rev[cur]:
            cost = 1 if index.kinds[prev] == "screen" else 0
            if dist[cur] + cost < dist[prev]:
                dist[prev] = dist[cur] + cost
                frontier.append(prev)
    return dist


def _self_loop(index: DocIndex, sid: str) -> bool:
    return any(t == sid for _, t in index.adjacency.get(sid, []))


def _tarjan(index: DocIndex) -> list[list[str]]:
    counter = [0]
    low: dict[str, int] = {}
    num: dict[str, int] = {}
    stack: list[str] = []
    on_stack: set[str] = set()
    out: list[list[str]] = []
    for root in index.kinds:
        if root in num:
            continue
        work: list[tuple[str, int]] = [(root, 0)]
        while work:
            node, pos = work.pop()
            if pos == 0:
                num[node] = low[node] = counter[0]
                counter[0] += 1
                stack.append(node)
                on_stack.add(node)
            edges = index.adjacency.get(node, [])
            recursed = False
            for i in range(pos, len(edges)):
                tgt = edges[i][1]
                if tgt not in num:
                    work.append((node, i + 1))
                    work.append((tgt, 0))
                    recursed = True
                    break
                if tgt in on_stack:
                    low[node] = min(low[node], num[tgt])
            if recursed:
                continue
            if low[node] == num[node]:
                comp: list[str] = []
                while True:
                    member = stack.pop()
                    on_stack.discard(member)
                    comp.append(member)
                    if member == node:
                        break
                out.append(comp)
            if work:
                parent = work[-1][0]
                low[parent] = min(low[parent], low[node])
    return out


def _outline_order(index: DocIndex) -> dict[str, int]:
    order: dict[str, int] = {}
    stack = [index.first_step] if index.first_step else []
    while stack:
        cur = stack.pop()
        if cur in order:
            continue
        order[cur] = len(order)
        next_target = index.target(cur, "next") or index.target(cur, "else")
        is_condition = index.kinds.get(cur) == "condition"
        branch_targets = [
            t
            for port, t in index.adjacency.get(cur, [])
            if port not in ("next", "else") and (t != next_target or is_condition)
        ]
        if next_target:
            stack.append(next_target)
        stack.extend(reversed(branch_targets))
    for step in index.doc.steps:
        order.setdefault(step.id, len(order))
    return order


def outline_rank(index: DocIndex, target: Any) -> int:
    for candidate in (getattr(target, "screen_id", None), getattr(target, "id", None)):
        if candidate in index.order:
            return index.order[candidate]
    return INFINITY
