from langgraph.graph import StateGraph, END
from typing import Callable
def build_retry_fallback_subflow(primary_fn: Callable, fallback_fn: Callable, finalize_fn: Callable, confidence_threshold=0.6, max_attempts=2):
    # Builds a subgraph with retry self-loop
    from app.graphs.state import DecisionState
    g=StateGraph(DecisionState)
    def attempt_node(state: DecisionState):
        res=primary_fn(state)
        # primary_fn returns dict to merge
        return res
    def should_retry(state: DecisionState):
        conf=state.get("confidence",0)
        att=state.get("attempt",1)
        if conf >= confidence_threshold: return "finalize"
        if att >= state.get("max_attempts", max_attempts): return "fallback"
        return "retry"
    def retry_node(state: DecisionState):
        # inject previous failure reason into next attempt
        state["attempt"]=state.get("attempt",1)+1
        # call primary again with updated state
        res=primary_fn(state)
        return res
    def fallback_node(state: DecisionState):
        res=fallback_fn(state)
        res["used_fallback"]=True
        return res
    g.add_node("attempt_step", attempt_node)
    g.add_node("retry", retry_node)
    g.add_node("fallback", fallback_node)
    g.add_node("finalize", finalize_fn)
    g.set_entry_point("attempt_step")
    g.add_conditional_edges("attempt_step", should_retry, {"finalize":"finalize","fallback":"fallback","retry":"retry"})
    g.add_conditional_edges("retry", should_retry, {"finalize":"finalize","fallback":"fallback","retry":"retry"})
    g.add_edge("fallback","finalize")
    g.add_edge("finalize", END)
    return g.compile()
