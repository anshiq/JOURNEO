import json
import pathlib

import pytest

from app.modules.journeys.domain.ports import ports_of, screen_outputs
from app.modules.journeys.domain.schema.doc import JourneyDoc
from app.modules.journeys.domain.validate import validate

ROOT = pathlib.Path(__file__).resolve().parents[4] / "contracts" / "conformance"
CASES = sorted(ROOT.glob("*.json"))


def test_corpus_size():
    assert len(CASES) >= 25


@pytest.mark.parametrize("path", CASES, ids=[p.stem for p in CASES])
def test_case(path: pathlib.Path):
    case = json.loads(path.read_text())
    parsed = JourneyDoc.model_validate(case["doc"])
    expect = case["expect"]
    assert {s.id: [p.port for p in ports_of(parsed, s.id)] for s in parsed.steps} == expect["ports"]
    outputs = {sid: [{"key": o.key, "type": o.type} for o in screen_outputs(s)] for sid, s in parsed.screens.items()}
    assert outputs == expect["outputs"]
    issues = sorted(
        [{"code": i.code, "target": i.target.as_dict()} for i in validate(parsed)],
        key=lambda x: (x["code"], json.dumps(x["target"], sort_keys=True)),
    )
    assert issues == expect["issues"]
