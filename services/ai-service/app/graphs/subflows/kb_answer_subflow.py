from app.graphs.state import DecisionState
from app.rag.retriever import retrieve
from app.llm.client import get_llm, llm_available
def build():
    from app.graphs.retry_fallback import build_retry_fallback_subflow
    def primary(state: DecisionState):
        ctx=state.get("context",{})
        query=ctx.get("query") or ctx.get("question") or str(ctx)[:200]
        ret=retrieve(query, k=4)
        if not ret.get("grounded"):
            return {"outcome":"Not grounded - no relevant knowledge","branch":"not_grounded","confidence":0.9,"attempt":state.get("attempt",1),"kb_results":ret}
        # grounded - synthesize with LLM
        context_str="\n".join([f"[{i+1}] {r['content'][:400]}" for i,r in enumerate(ret["results"])])
        prompt=f"Answer based ONLY on context. If not in context say not found.\nContext:\n{context_str}\n\nQuestion: {query}\nCite sources as [1],[2]."
        if not llm_available():
            # return raw top chunk as fallback synthesis
            top=ret["results"][0]
            return {"outcome":top["content"][:500],"branch":"answered","confidence":0.6,"attempt":state.get("attempt",1),"kb_results":ret,"synthesized":False}
        try:
            llm=get_llm()
            res=llm.invoke(prompt)
            return {"outcome":res.content[:800],"branch":"answered","confidence":0.75,"attempt":state.get("attempt",1),"kb_results":ret}
        except Exception as e:
            return {"outcome":"error","branch":"default","confidence":0.3,"error":str(e),"attempt":state.get("attempt",1)}
    def fallback(state: DecisionState):
        ctx=state.get("context",{})
        query=ctx.get("query") or str(ctx)[:200]
        ret=retrieve(query, k=2)
        if ret.get("results"):
            top=ret["results"][0]
            return {"outcome":top["content"][:500],"branch":"answered","confidence":0.4,"kb_results":ret,"synthesized":False}
        return {"outcome":"No knowledge found","branch":"not_grounded","confidence":0.5}
    def finalize(state: DecisionState):
        return {"outcome": state.get("outcome",""), "branch": state.get("branch","default")}
    return build_retry_fallback_subflow(primary, fallback, finalize)
