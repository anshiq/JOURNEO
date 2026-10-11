from collections.abc import Iterator
from typing import Any

from app.modules.journeys.domain.analysis import DocIndex
from app.modules.journeys.domain.ports import next_producers
from app.modules.journeys.domain.rules.model import Issue, Target, ValidationContext, error, warning
from app.modules.journeys.domain.summary import plain, step_name


def check_entry(doc: Any, index: DocIndex, ctx: ValidationContext) -> Iterator[Issue]:
    if index.first_step and not index.target(index.first_step, "next"):
        yield error(
            "J_ENTRY",
            "Connect the start of the journey to your first screen",
            Target(kind="step", id=index.first_step),
            "connect_start",
        )


def check_exits(doc: Any, index: DocIndex, ctx: ValidationContext) -> Iterator[Issue]:
    for step in doc.steps:
        if step.kind == "screen":
            yield from _screen_exits(doc, index, step.id)
        elif step.kind == "condition":
            for rule in step.rules:
                if not index.target(step.id, f"rule:{rule.id}"):
                    yield error(
                        "J_EXIT_OPEN",
                        f"Path ‘{plain(rule.label, 30)}’ goes nowhere",
                        Target(kind="step", id=step.id, item_id=rule.id, field="target"),
                        "focus_destination",
                    )
            if not index.target(step.id, "else"):
                yield error(
                    "J_EXIT_OPEN",
                    "Choose where everyone else goes",
                    Target(kind="step", id=step.id, field="else"),
                    "focus_destination",
                )


def _screen_exits(doc: Any, index: DocIndex, screen_id: str) -> Iterator[Issue]:
    ports = index.ports.get(screen_id, [])
    if not ports or index.target(screen_id, "next"):
        return
    screen = doc.screens[screen_id]
    reported = False
    for port in ports:
        if port.port == "next" or index.target(screen_id, port.port):
            continue
        reported = True
        yield error(
            "J_EXIT_OPEN",
            f"‘{plain(port.label, 30)}’ goes nowhere",
            Target(
                kind="item" if port.item_id else "element",
                id=port.element_id or screen_id,
                screen_id=screen_id,
                item_id=port.item_id,
                field="target",
            ),
            "focus_destination",
        )
    if reported:
        return
    for element_id, item_id, label in next_producers(screen):
        yield error(
            "J_EXIT_OPEN",
            f"‘{plain(label, 30)}’ goes nowhere",
            Target(
                kind="item" if item_id else "element",
                id=element_id,
                screen_id=screen_id,
                item_id=item_id,
                field="target",
            ),
            "focus_destination",
        )


def check_unreachable(doc: Any, index: DocIndex, ctx: ValidationContext) -> Iterator[Issue]:
    for step in doc.steps:
        if step.kind != "start" and step.id not in index.reachable:
            yield warning(
                "J_UNREACHABLE",
                f"‘{step_name(doc, step.id)}’ is not connected, visitors will never see it",
                Target(kind="screen" if step.kind == "screen" else "step", id=step.id),
                "connect_or_delete",
            )


def check_loops(doc: Any, index: DocIndex, ctx: ValidationContext) -> Iterator[Issue]:
    for comp in index.sccs:
        members = set(comp)
        cyclic = len(comp) > 1 or any(t == comp[0] for _, t in index.adjacency.get(comp[0], []))
        if not cyclic:
            continue
        first = min(comp, key=lambda s: index.order.get(s, 10**9))
        if not any(index.kinds[s] == "screen" for s in comp):
            yield error(
                "J_LOGIC_LOOP",
                "These conditions point at each other in a loop",
                Target(kind="step", id=first),
                "select_cycle",
            )
            continue
        leaves = any(t not in members for s in comp for _, t in index.adjacency.get(s, []))
        if not leaves and members & index.reachable:
            yield error(
                "J_LOGIC_LOOP",
                f"Visitors who reach ‘{step_name(doc, first)}’ can never finish",
                Target(kind="screen" if index.kinds[first] == "screen" else "step", id=first),
                "select_cycle",
            )
