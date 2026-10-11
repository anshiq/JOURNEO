import json
import pathlib
from typing import Any

from app.modules.journeys.domain.ids import sequential_ids
from app.modules.journeys.domain.ops import instantiate_element, instantiate_screen
from app.modules.journeys.domain.schema.doc import JourneyDoc
from app.modules.journeys.domain.validate import blocking, validate

_state: dict[str, dict[str, dict[str, Any]]] = {"templates": {}, "recipes": {}, "presets": {}}


class LibraryError(Exception):
    pass


def root_for(contracts_dir: str) -> pathlib.Path:
    path = pathlib.Path(contracts_dir)
    if not path.is_absolute():
        path = pathlib.Path(__file__).resolve().parents[5] / contracts_dir
    return path / "library"


def _read(folder: pathlib.Path) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for file in sorted(folder.glob("*.json")):
        item = json.loads(file.read_text())
        if item.get("id") != file.stem:
            raise LibraryError(f"{file.name} id must match file name")
        out[file.stem] = item
    return out


def wrap_screen(screen: dict[str, Any]) -> dict[str, Any]:
    return {
        "schemaVersion": 4,
        "screens": {screen["id"]: screen},
        "steps": [{"id": "stp_wrap00", "kind": "start"}, {"id": screen["id"], "kind": "screen"}],
        "links": {"stp_wrap00": {"next": screen["id"]}},
    }


def check_library(templates: dict[str, Any], recipes: dict[str, Any], presets: dict[str, Any]) -> None:
    for tid, template in templates.items():
        try:
            parsed = JourneyDoc.model_validate(template["doc"])
        except Exception as exc:
            raise LibraryError(f"template {tid}: {exc}") from exc
        errors = blocking(validate(parsed))
        if errors:
            raise LibraryError(f"template {tid}: {[e.message for e in errors]}")
    for rid, recipe in recipes.items():
        screen = instantiate_screen(recipe, sequential_ids(), set())
        try:
            JourneyDoc.model_validate(wrap_screen(screen))
        except Exception as exc:
            raise LibraryError(f"recipe {rid}: {exc}") from exc
    for pid, preset in presets.items():
        element = instantiate_element(preset["element"], sequential_ids(), set())
        screen = {"id": "scr_preset0", "name": "Preset", "elements": [element]}
        try:
            JourneyDoc.model_validate(wrap_screen(screen))
        except Exception as exc:
            raise LibraryError(f"preset {pid}: {exc}") from exc


def load(settings: Any) -> None:
    base = root_for(settings.contracts_dir)
    templates = _read(base / "templates")
    recipes = _read(base / "recipes")
    presets = _read(base / "presets")
    check_library(templates, recipes, presets)
    _state["templates"], _state["recipes"], _state["presets"] = templates, recipes, presets


def ensure_loaded(settings: Any) -> None:
    if not _state["templates"]:
        load(settings)


def templates() -> list[dict[str, Any]]:
    return list(_state["templates"].values())


def template(template_id: str) -> dict[str, Any] | None:
    return _state["templates"].get(template_id)


def recipes() -> list[dict[str, Any]]:
    return list(_state["recipes"].values())


def recipe(recipe_id: str) -> dict[str, Any] | None:
    return _state["recipes"].get(recipe_id)


def recipes_by_id() -> dict[str, dict[str, Any]]:
    return dict(_state["recipes"])


def presets() -> list[dict[str, Any]]:
    return list(_state["presets"].values())
