from app.rag.embeddings import get_embeddings
from app.rag.vectorstore import similarity_search

SIM_FLOOR=0.25
def retrieve(query: str, k=4):
    emb_model=get_embeddings()
    q_emb=emb_model.embed_query(query)
    results=similarity_search(q_emb, k=k)
    if not results: return {"grounded":False, "results":[], "reason":"no results"}
    top=results[0]["similarity"]
    if top < SIM_FLOOR:
        return {"grounded":False, "results":results, "reason":f"top similarity {top:.2f} < floor {SIM_FLOOR}"}
    return {"grounded":True, "results":results}
