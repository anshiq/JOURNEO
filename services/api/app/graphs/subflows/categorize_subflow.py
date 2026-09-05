from app.graphs.state import DecisionState
from app.llm.client import get_llm, llm_available
def build():
    from langgraph.graph import StateGraph, END
    g=StateGraph(DecisionState)
    def primary(state: DecisionState):
        ctx=str(state.get("context",{}))
        prompt=f"Categorize this viewer: {ctx}. Return category: high_intent, low_intent, churn_risk, or unknown. Also branch: qualified/unqualified."
        if not llm_available():
            return {"outcome":"low_intent","branch":"unqualified","confidence":0.55,"attempt":state.get("attempt",1)}
        try:
            llm=get_llm()
            res=llm.invoke(prompt)
            txt=res.content.lower()
            if "high_intent" in txt: cat="high_intent"; branch="qualified"
            elif "churn" in txt: cat="churn_risk"; branch="unqualified"
            elif "low_intent" in txt: cat="low_intent"; branch="unqualified"
            else: cat="unknown"; branch="default"
            return {"outcome":cat,"branch":branch,"confidence":0.7,"attempt":state.get("attempt",1)}
        except Exception as e:
            return {"outcome":"error","branch":"default","confidence":0.3,"error":str(e),"attempt":state.get("attempt",1)}
    def fallback(state: DecisionState):
        # deterministic
        ctx=state.get("context",{})
        age=ctx.get("age",30) if isinstance(ctx,dict) else 30
        if isinstance(age,int) and age>25:
            return {"outcome":"low_intent","branch":"unqualified","confidence":0.5}
        return {"outcome":"high_intent","branch":"qualified","confidence":0.5}
    def finalize(state: DecisionState):
        return {"outcome": state.get("outcome",""), "branch": state.get("branch","default")}
    from app.graphs.retry_fallback import build_retry_fallback_subflow
    return build_retry_fallback_subflow(primary, fallback, finalize)
