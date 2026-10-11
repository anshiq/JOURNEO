from typing import Any

from app.modules.journeys.domain.ports import ports_of


def resolve_target(doc: Any, step_id: str, port: str) -> str | None:
    links = doc.links.get(step_id, {})
    direct = links.get(port)
    if direct:
        return direct
    declared = next((p for p in ports_of(doc, step_id) if p.port == port), None)
    if declared is not None and declared.fallback == "next":
        return links.get("next")
    return None
