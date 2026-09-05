from app.graphs.state import DecisionState
from app.llm.client import get_llm, llm_available
def build():
    from langgraph.graph import StateGraph
    from app.graphs.retry_fallback import build_retry_fallback_subflow
    def primary(state: DecisionState):
        ctx=str(state.get("context",{}))
        prompt=f"Evaluate lead quality given: {ctx}. Score 0-100 and branch high/low. Return JSON with score and branch."
        if not llm_available():
            return {"outcome":"score:65","branch":"high","confidence":0.6,"attempt":state.get("attempt",1)}
        try:
            llm=get_llm()
            res=llm.invoke(prompt)
            txt=res.content.lower()
            branch="high" if "high" in txt else "low"
            return {"outcome":res.content[:200],"branch":branch,"confidence":0.65,"attempt":state.get("attempt",1)}
        except Exception as e:
            return {"outcome":"error","branch":"default","confidence":0.3,"error":str(e),"attempt":state.get("attempt",1)}
    def fallback(state: DecisionState):
        return {"outcome":"score:50","branch":"low","confidence":0.5}
    def finalize(state: DecisionState):
        return {"outcome": state.get("outcome",""), "branch": state.get("branch","default")}
    return build_retry_fallback_subflow(primary, fallback, finalize)
