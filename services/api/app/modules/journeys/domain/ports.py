from dataclasses import dataclass
from typing import Any

FIELD_OUTPUT = {
    "name": "text",
    "email": "email",
    "phone": "phone",
    "company": "text",
    "text": "text",
    "longtext": "text",
    "number": "number",
    "date": "date",
    "dropdown": "text",
    "consent": "boolean",
}


@dataclass(frozen=True, slots=True)
class Port:
    port: str
    label: str
    element_id: str | None = None
    item_id: str | None = None
    validates: bool = False
    fallback: str | None = None


@dataclass(frozen=True, slots=True)
class Output:
    key: str
    type: str
    label: str
    element_id: str
    options: tuple[tuple[str, str], ...] = ()

    def as_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {"key": self.key, "type": self.type, "label": self.label, "elementId": self.element_id}
        if self.options:
            out["options"] = [{"id": i, "label": label} for i, label in self.options]
        return out


def next_producers(screen: Any) -> list[tuple[str, str | None, str]]:
    found: list[tuple[str, str | None, str]] = []
    for el in screen.elements:
        if el.type == "buttons":
            found.extend((el.id, item.id, item.label) for item in el.props.items if item.action.kind == "next")
        elif el.type == "cards":
            found.extend(
                (el.id, item.id, item.button.label)
                for item in el.props.items
                if item.button is not None and item.button.action.kind == "next"
            )
        elif el.type == "choice" and el.props.auto_advance and not el.props.multiple:
            found.append((el.id, None, el.props.question or "Answer"))
        elif el.type == "form":
            found.append((el.id, None, el.props.submit_label))
    return found


def screen_ports(screen: Any) -> list[Port]:
    ports: list[Port] = []
    for el in screen.elements:
        props = el.props
        if el.type == "buttons":
            ports.extend(
                Port(
                    port=f"{el.id}:{item.id}",
                    label=item.label,
                    element_id=el.id,
                    item_id=item.id,
                    validates=not item.action.skip_validation,
                    fallback="next",
                )
                for item in props.items
                if item.action.kind == "goto"
            )
        elif el.type == "cards":
            ports.extend(
                Port(
                    port=f"{el.id}:{item.id}",
                    label=item.button.label,
                    element_id=el.id,
                    item_id=item.id,
                    validates=not item.button.action.skip_validation,
                    fallback="next",
                )
                for item in props.items
                if item.button is not None and item.button.action.kind == "goto"
            )
        elif el.type == "choice" and props.branch_by_answer and not props.multiple:
            ports.extend(
                Port(
                    port=f"{el.id}:opt:{opt.id}",
                    label=opt.label,
                    element_id=el.id,
                    item_id=opt.id,
                    validates=True,
                    fallback="next",
                )
                for opt in props.options
            )
            if props.other:
                ports.append(
                    Port(port=f"{el.id}:opt:other", label="Other", element_id=el.id, validates=True, fallback="next")
                )
        elif el.type == "rating" and props.branch_by_score:
            ports.extend(
                Port(
                    port=f"{el.id}:band:{band.id}",
                    label=band.label,
                    element_id=el.id,
                    item_id=band.id,
                    validates=True,
                    fallback="next",
                )
                for band in props.bands or []
            )
    if next_producers(screen) or ports:
        return [Port(port="next", label="Next", validates=True, fallback=None), *ports]
    return []


def step_by_id(doc: Any, step_id: str) -> Any:
    for step in doc.steps:
        if step.id == step_id:
            return step
    return None


def ports_of(doc: Any, step_id: str) -> list[Port]:
    step = step_by_id(doc, step_id)
    if step is None:
        return []
    if step.kind == "start":
        return [Port(port="next", label="Start")]
    if step.kind == "screen":
        screen = doc.screens.get(step.id)
        return screen_ports(screen) if screen is not None else []
    if step.kind == "condition":
        out = [Port(port=f"rule:{r.id}", label=r.label) for r in step.rules]
        out.append(Port(port="else", label="Otherwise"))
        return out
    return []


def screen_outputs(screen: Any) -> list[Output]:
    outputs: list[Output] = []
    for el in screen.elements:
        props = el.props
        if el.type == "choice":
            outputs.append(
                Output(
                    key=props.key,
                    type="choices" if props.multiple else "choice",
                    label=props.question,
                    element_id=el.id,
                    options=tuple((o.id, o.label) for o in props.options),
                )
            )
        elif el.type == "rating":
            outputs.append(Output(key=props.key, type="rating", label=props.question, element_id=el.id))
        elif el.type == "form":
            outputs.extend(
                Output(key=f.key, type=FIELD_OUTPUT[f.kind], label=f.label, element_id=el.id) for f in props.fields
            )
    return outputs
