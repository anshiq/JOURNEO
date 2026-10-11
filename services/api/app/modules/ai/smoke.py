import argparse
import asyncio
import json
import pathlib
import statistics
import sys
import time
from typing import Any

from app.core.config import get_settings
from app.core.llm import make_llm
from app.modules.ai import service
from app.modules.ai.mock import install as install_mock_llm
from app.modules.journeys import library


async def run(briefs: list[dict[str, Any]], min_ok: int) -> int:
    settings = get_settings()
    library.load(settings)
    if settings.llm.mode == "mock":
        install_mock_llm()
    llm = make_llm(settings.llm)
    model = settings.llm.generation
    rows: list[dict[str, Any]] = []
    for item in briefs:
        brief = service.brief_of(item)
        started = time.perf_counter()
        built = await service.build_draft(llm, model, brief, {}, service.DetachedHooks())
        seconds = round(time.perf_counter() - started, 2)
        rows.append(
            {
                "brief": brief["brief"][:60],
                "seconds": seconds,
                "screens": len(built.doc.get("screens", {})),
                "fallbackScreens": len(built.fallback),
                "templateOnly": built.spec is None,
                "blocking": len(built.issues),
                "ok": built.spec is not None and not built.fallback and not built.issues,
            }
        )
    ok = sum(1 for row in rows if row["ok"])
    summary = {
        "briefs": len(rows),
        "ok": ok,
        "fallbackRate": round(1 - ok / len(rows), 2) if rows else None,
        "medianSeconds": round(statistics.median(r["seconds"] for r in rows), 2) if rows else None,
        "model": model,
        "rows": rows,
    }
    print(json.dumps(summary, indent=2))
    return 0 if ok >= min_ok else 1


def main() -> None:
    parser = argparse.ArgumentParser(prog="app.modules.ai.smoke")
    parser.add_argument("--briefs", type=pathlib.Path, required=True)
    parser.add_argument("--min-ok", type=int, default=8)
    args = parser.parse_args()
    briefs = json.loads(args.briefs.read_text())
    sys.exit(asyncio.run(run(briefs, args.min_ok)))


if __name__ == "__main__":
    main()
