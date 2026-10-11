import pathlib
import re
from typing import Any

from jinja2 import Environment, FileSystemLoader, StrictUndefined, select_autoescape

from app.core.llm import LlmClient, LlmOutputError

_env = Environment(
    loader=FileSystemLoader(pathlib.Path(__file__).parent / "prompts"),
    undefined=StrictUndefined,
    autoescape=select_autoescape(default=False),
    keep_trailing_newline=True,
)
MARK = re.compile(r"</?b>")


def clean_snippet(snippet: str) -> str:
    return " ".join(MARK.sub("", snippet or "").split())


def citations(hits: list[dict[str, Any]], used: list[int] | None = None) -> list[dict[str, Any]]:
    picked = [hits[i - 1] for i in (used or []) if isinstance(i, int) and 0 < i <= len(hits)] or hits[:2]
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for hit in picked:
        if hit["source_id"] in seen:
            continue
        seen.add(hit["source_id"])
        out.append(
            {
                "sourceId": hit["source_id"],
                "title": hit["title"],
                "url": hit["uri"],
                "snippet": clean_snippet(hit["snippet"])[:240],
            }
        )
    return out


async def compose_answer(
    llm: LlmClient | None,
    model: str,
    campaign: str,
    voice: str | None,
    summary: str,
    question: str,
    hits: list[dict[str, Any]],
) -> dict[str, Any]:
    if llm is None:
        return {"answer": clean_snippet(hits[0]["snippet"]), "citations": citations(hits), "fallback": False}
    prompt = _env.get_template("answer.v1.j2").render(
        campaign=campaign, voice=voice, summary=summary, sources=[clean_snippet(h["snippet"]) for h in hits]
    )
    try:
        out = await llm.complete_json(
            task="assistant.answer",
            model=model,
            messages=[{"role": "system", "content": prompt}, {"role": "user", "content": question}],
            max_tokens=400,
            timeout=15,
        )
    except (LlmOutputError, Exception):
        return {"answer": clean_snippet(hits[0]["snippet"]), "citations": citations(hits), "fallback": False}
    answer = str(out.get("answer") or "").strip()
    if not answer:
        return {"answer": "", "citations": [], "fallback": True}
    used = [int(i) for i in out.get("citations", []) if str(i).isdigit()]
    return {"answer": answer[:1200], "citations": citations(hits, used), "fallback": False}
