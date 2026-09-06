from langgraph.graph import StateGraph, END
from app.graphs.state import DecisionState
from app.graphs.subflows.categorize_subflow import build as build_categorize
from app.graphs.subflows.evaluate_subflow import build as build_evaluate
from app.graphs.subflows.summarize_subflow import build as build_summarize
from app.graphs.subflows.kb_answer_subflow import build as build_kb
from app.graphs.subflows.query_resolve_subflow import build as build_query

cat_graph=build_categorize()
eval_graph=build_evaluate()
sum_graph=build_summarize()
kb_graph=build_kb()
query_graph=build_query()

def route_subtype(state: DecisionState):
    return state.get("subtype","categorize")

parent=StateGraph(DecisionState)
def postprocess(state: DecisionState):
    if not state.get("branch"):
        state["branch"]="default"
    return state

parent.add_node("categorize", cat_graph)
parent.add_node("evaluate", eval_graph)
parent.add_node("summarize", sum_graph)
parent.add_node("kb_answer", kb_graph)
parent.add_node("query_resolve", query_graph)
parent.add_node("postprocess", postprocess)
parent.set_conditional_entry_point(route_subtype, {"categorize":"categorize","evaluate":"evaluate","summarize":"summarize","kb_answer":"kb_answer","query_resolve":"query_resolve"})
parent.add_edge("categorize","postprocess")
parent.add_edge("evaluate","postprocess")
parent.add_edge("summarize","postprocess")
parent.add_edge("kb_answer","postprocess")
parent.add_edge("query_resolve","postprocess")
parent.add_edge("postprocess", END)
decision_graph=parent.compile()
