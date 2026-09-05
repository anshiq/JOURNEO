from app.graphs.state import DecisionState
from app.llm.client import get_llm, llm_available
def build():
    from app.graphs.retry_fallback import build_retry_fallback_subflow
    def primary(state: DecisionState):
        ctx=str(state.get("context",{}))
        prompt=f"Summarize this session: {ctx} in 1 sentence. Also return branch completed."
        if not llm_available():
            return {"outcome":f"Viewer profile {ctx} summarized","branch":"completed","confidence":0.6,"attempt":state.get("attempt",1)}
        try:
            llm=get_llm()
            res=llm.invoke(prompt)
            return {"outcome":res.content[:300],"branch":"completed","confidence":0.7,"attempt":state.get("attempt",1)}
        except Exception as e:
            return {"outcome":"error","branch":"default","confidence":0.3,"error":str(e),"attempt":state.get("attempt",1)}
    def fallback(state: DecisionState):
        ctx=state.get("context",{})
        # extractive template fallback - non LLM
        return {"outcome":f"Session {ctx.get('sessionId','?')} interest={ctx.get('interest')} location={ctx.get('location')}","branch":"completed","confidence":0.4, "synthesized":False}
    def finalize(state: DecisionState):
        return {"outcome": state.get("outcome",""), "branch": state.get("branch","default")}
    return build_retry_fallback_subflow(primary, fallback, finalize)
