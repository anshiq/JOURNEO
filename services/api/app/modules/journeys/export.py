import json
import pathlib
from typing import Any

from app.modules.journeys.domain.limits import LIMITS
from app.modules.journeys.domain.schema.doc import JourneyDoc

ROOT = pathlib.Path(__file__).resolve().parents[5]


def export_schema() -> dict[str, Any]:
    return JourneyDoc.model_json_schema(mode="validation", by_alias=True)


def write(path: pathlib.Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True, ensure_ascii=False) + "\n")


def main() -> None:
    from app.main import create_app

    write(ROOT / "contracts" / "schema" / "journey-doc.v4.schema.json", export_schema())
    write(ROOT / "contracts" / "schema" / "limits.json", LIMITS)
    write(ROOT / "contracts" / "openapi" / "api.json", create_app().openapi())


if __name__ == "__main__":
    main()
