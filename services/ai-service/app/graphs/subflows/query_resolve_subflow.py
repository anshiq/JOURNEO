import json
import re
from app.graphs.state import DecisionState
from app.rag.retriever import retrieve_for_llm
from app.llm.client import get_llm, llm_available, invoke_with_fallback

TEXT_FIELDS = ["headline", "title", "label", "content", "question", "description", "placeholder", "message", "text", "name"]
SKIP_FIELDS = {"theme", "style"}
DEFAULT_OUT_OF_CONTEXT = "This question is out of context."
CONFIDENCE_BAR = 0.5


def summarize_graph(graph, limit=60, chars=220):
    nodes = (graph or {}).get("nodes", []) if isinstance(graph, dict) else []
    out = []
    for n in nodes[:limit]:
        if not isinstance(n, dict):
            continue
        if (n.get("type") or "") == "ask_ai":
            continue
        cfg = n.get("config") if isinstance(n.get("config"), dict) else {}
        parts = []
        for f in TEXT_FIELDS:
            v = cfg.get(f)
            if isinstance(v, str) and v.strip():
                parts.append(f"{f}:{v.strip()[:chars]}")
        for k, v in cfg.items():
            if k in TEXT_FIELDS or k in SKIP_FIELDS:
                continue
            if isinstance(v, (str, int, float, bool)) and str(v).strip():
                parts.append(f"{k}:{str(v).strip()[:120]}")
            elif isinstance(v, list) and v and all(isinstance(x, (str, int, float)) for x in v[:6]):
                parts.append(f"{k}:" + "|".join([str(x)[:60] for x in v[:6]]))
        opts = cfg.get("options")
        if isinstance(opts, list) and opts:
            names = []
            for o in opts[:6]:
                if isinstance(o, dict):
                    names.append(str(o.get("label") or o.get("value") or o.get("text") or "")[:60])
                else:
                    names.append(str(o)[:60])
            parts.append("options:" + "|".join([x for x in names if x]))
        ctas = cfg.get("ctas")
        if isinstance(ctas, list) and ctas:
            parts.append("ctas:" + "|".join([str(c.get("label") if isinstance(c, dict) else c)[:60] for c in ctas[:4]]))
        out.append({"id": n.get("id"), "type": n.get("type"), "text": " ".join(parts)[:600]})
    return out


TITLE_FIELDS = ["headline", "title", "label", "question", "name"]
SUBTITLE_FIELDS = ["subheadline", "description", "content", "message", "placeholder", "helperText"]
HIDE_FIELDS = {"theme", "style", "src", "url", "image", "imageUrl", "backgroundImage", "href", "link", "videoUrl"}


def node_details(node, chars=160):
    if not isinstance(node, dict):
        return {}
    cfg = node.get("config") if isinstance(node.get("config"), dict) else {}
    title = ""
    for f in TITLE_FIELDS:
        v = cfg.get(f)
        if isinstance(v, str) and v.strip():
            title = v.strip()[:chars]
            break
    subtitle = ""
    for f in SUBTITLE_FIELDS:
        v = cfg.get(f)
        if isinstance(v, str) and v.strip() and v.strip() != title:
            subtitle = v.strip()[:300]
            break
    facts = []
    for k, v in cfg.items():
        if k in TITLE_FIELDS or k in SUBTITLE_FIELDS or k in HIDE_FIELDS or k in SKIP_FIELDS:
            continue
        if isinstance(v, (str, int, float, bool)) and str(v).strip():
            facts.append({"label": k, "value": str(v).strip()[:chars]})
        elif isinstance(v, list) and v:
            names = []
            for o in v[:6]:
                if isinstance(o, dict):
                    names.append(str(o.get("label") or o.get("value") or o.get("text") or "")[:80])
                else:
                    names.append(str(o)[:80])
            names = [x for x in names if x]
            if names:
                facts.append({"label": k, "value": ", ".join(names)[:chars]})
        if len(facts) >= 6:
            break
    return {"nodeId": node.get("id"), "nodeType": node.get("type"), "title": title, "subtitle": subtitle, "facts": facts}


def node_summary_text(node, chars=500):
    if not isinstance(node, dict):
        return ""
    cfg = node.get("config") if isinstance(node.get("config"), dict) else {}
    bits = [f"type:{node.get('type')}"]
    for k, v in cfg.items():
        if k in SKIP_FIELDS:
            continue
        if isinstance(v, (str, int, float, bool)) and str(v).strip():
            bits.append(f"{k}:{str(v).strip()[:160]}")
        elif isinstance(v, list) and v:
            names = []
            for o in v[:6]:
                if isinstance(o, dict):
                    names.append(str(o.get("label") or o.get("value") or o.get("text") or o.get("question") or "")[:80])
                else:
                    names.append(str(o)[:80])
            names = [x for x in names if x]
            if names:
                bits.append(f"{k}:" + "|".join(names))
    return " ".join(bits)[:chars]


def template_answer(details):
    t = str((details or {}).get("title") or "").strip()
    s = str((details or {}).get("subtitle") or "").strip()
    if t and s:
        return f"{t}. {s}"
    return t or s or ""


def parse_llm_output(txt):
    if not txt:
        return None, 0.0, "", "empty-llm-output"
    m = re.search(r"\{.*\}", txt, re.DOTALL)
    if not m:
        return None, 0.0, "", "no-json"
    try:
        data = json.loads(m.group(0))
    except Exception:
        return None, 0.0, "", "bad-json"
    tid = data.get("targetNodeId") or data.get("target_node_id") or data.get("nodeId")
    try:
        conf = float(data.get("confidence", 0))
    except Exception:
        conf = 0.0
    answer = str(data.get("answer") or "").strip()[:1200]
    reason = str(data.get("reason", "") or "")[:300]
    return tid, max(0.0, min(1.0, conf)), answer, reason or "llm"


def resolve_with_llm(query, summary, chunks):
    node_lines = "\n".join([f"- {s['id']} [{s['type']}] {s['text'][:300]}" for s in summary])
    chunk_lines = "\n".join([f"[{i+1}] {(c.get('content') or '')[:500]}" for i, c in enumerate(chunks)])
    prompt = (
        "Answer the user query using ONLY the journey nodes and knowledge chunks below.\n"
        f"Query: {query}\n\nJourney nodes:\n{node_lines or '(none)'}\n\nKnowledge:\n{chunk_lines or '(none)'}\n\n"
        'Return ONLY JSON like {"targetNodeId": "<id>" or null, "confidence": 0-1, "answer": "<friendly 1-2 sentences>", "reason": "<short>"}. '
        "Decide by meaning, never by exact wording: if ANY node holds the answer in any form — names, specs, prices, "
        "times, options, labels, even loosely related in sense — set its id with confidence >= 0.5 and write the answer "
        "from its facts in friendly natural language. "
        "Otherwise, if the knowledge chunks answer it, set targetNodeId to null and answer from the chunks with [n] cites. "
        "If nothing answers it, set targetNodeId to null, confidence 0, and an empty answer."
    )
    res = invoke_with_fallback(prompt)
    return parse_llm_output(res.content)


def out_of_context(refusal, reason, attempt, kb_results=None):
    return {"decision": "reject", "branch": "rejected", "outcome": refusal, "answer": refusal, "confidence": 0.9, "reason": reason, "attempt": attempt, "kb_results": kb_results}


def resolve_query(state: DecisionState):
    ctx = state.get("context") if isinstance(state.get("context"), dict) else {}
    query = state.get("query") or (ctx.get("query") if isinstance(ctx, dict) else "") or ""
    query = str(query).strip()
    graph = state.get("journey_graph") or (ctx.get("journeyGraph") if isinstance(ctx, dict) else None) or {}
    cfg = state.get("config") if isinstance(state.get("config"), dict) else {}
    if isinstance(ctx, dict) and isinstance(ctx.get("config"), dict):
        cfg = {**ctx.get("config"), **cfg}
    rag_k = int(cfg.get("ragK", 8) or 8)
    refusal = str(cfg.get("refusalMessage") or DEFAULT_OUT_OF_CONTEXT)
    allow_jump = cfg.get("allowJourneyJump", True) is not False
    allow_rag = cfg.get("allowRag", True) is not False
    attempt = state.get("attempt", 1)
    if not query:
        return out_of_context(refusal, "empty-query", attempt)
    if not llm_available():
        return out_of_context(refusal, "llm-unavailable", attempt)
    nodes = graph.get("nodes", []) if isinstance(graph, dict) else []
    node_ids = {n.get("id") for n in nodes if isinstance(n, dict) and n.get("id")}
    id_to_node = {n.get("id"): n for n in nodes if isinstance(n, dict) and n.get("id")}
    id_to_type = {nid: (n.get("type") or "") for nid, n in id_to_node.items()}
    summary = summarize_graph(graph)
    chunks = []
    if allow_rag:
        try:
            chunks = retrieve_for_llm(query, k=rag_k)
        except Exception as e:
            return out_of_context(refusal, f"retriever-error:{str(e)[:120]}", attempt)
    try:
        tid, conf, answer, reason = resolve_with_llm(query, summary, chunks)
    except Exception as e:
        return out_of_context(refusal, f"llm-error:{str(e)[:120]}", attempt, kb_results={"results": chunks})
    kb = {"results": chunks}
    if tid and tid in node_ids and id_to_type.get(tid) != "ask_ai" and conf >= CONFIDENCE_BAR and allow_jump:
        details = node_details(id_to_node.get(tid))
        final = answer or template_answer(details) or tid
        cits = [{"chunk_id": c.get("chunk_id"), "snippet": (c.get("content") or "")[:200], "similarity": c.get("similarity")} for c in chunks]
        return {"decision": "jump", "branch": "jump", "outcome": final[:1200], "answer": final[:1200], "target_node_id": tid, "target_node_type": id_to_type.get(tid, ""), "target_node_summary": node_summary_text(id_to_node.get(tid)), "target_node_details": details, "citations": cits, "confidence": conf, "reason": reason, "attempt": attempt, "kb_results": kb}
    if answer:
        cits = [{"chunk_id": c.get("chunk_id"), "snippet": (c.get("content") or "")[:200], "similarity": c.get("similarity")} for c in chunks]
        return {"decision": "rag", "branch": "rag_answered", "outcome": answer[:1200], "answer": answer[:1200], "citations": cits, "confidence": conf or 0.6, "reason": reason, "attempt": attempt, "kb_results": kb}
    return out_of_context(refusal, reason or "no-match", attempt, kb_results=kb)


def build():
    from langgraph.graph import StateGraph, END

    def resolve_node(state: DecisionState):
        return resolve_query(state)

    g = StateGraph(DecisionState)
    g.add_node("resolve", resolve_node)
    g.set_entry_point("resolve")
    g.add_edge("resolve", END)
    return g.compile()


query_resolve_graph = build()
