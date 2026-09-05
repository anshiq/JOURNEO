from sqlalchemy import text
from app.db.session import engine

def ensure_vector_extension():
    try:
        with engine.begin() as c:
            c.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            c.execute(text("""
            CREATE TABLE IF NOT EXISTS document_embeddings (
                id SERIAL PRIMARY KEY,
                chunk_id INTEGER,
                embedding vector(384),
                content TEXT
            )
            """))
            # create HNSW index if not exists
            try:
                c.execute(text("CREATE INDEX IF NOT EXISTS doc_emb_hnsw ON document_embeddings USING hnsw (embedding vector_cosine_ops)"))
            except Exception as e:
                print(f"hnsw index failed {e}")
    except Exception as e:
        print(f"vector ensure failed {e}")

# Simple in-memory fallback if pgvector not available
_inmem=[]
def add_embeddings(chunks, embeddings):
    # chunks: list of (chunk_id, text), embeddings: list of vectors
    ensure_vector_extension()
    try:
        with engine.begin() as c:
            for (cid, txt), emb in zip(chunks, embeddings):
                # emb is list[float]
                c.execute(text("INSERT INTO document_embeddings (chunk_id, embedding, content) VALUES (:cid, :emb, :txt)"), {"cid":cid, "emb":str(emb), "txt":txt})
        return
    except Exception as e:
        print(f"pgvector insert failed, using inmem: {e}")
        for (cid,txt), emb in zip(chunks, embeddings):
            _inmem.append({"chunk_id":cid, "embedding":emb, "content":txt})

def similarity_search(query_emb, k=4):
    ensure_vector_extension()
    try:
        with engine.begin() as c:
            # query_emb is list[float]
            rows=c.execute(text("SELECT chunk_id, content, 1 - (embedding <=> CAST(:q AS vector)) as sim FROM document_embeddings ORDER BY embedding <=> CAST(:q AS vector) LIMIT :k"), {"q":str(query_emb), "k":k}).fetchall()
            return [{"chunk_id":r[0],"content":r[1],"similarity":float(r[2])} for r in rows]
    except Exception as e:
        print(f"vector search failed, fallback inmem {e}")
        import numpy as np
        q=np.array(query_emb)
        scored=[]
        for item in _inmem:
            emb=np.array(item["embedding"])
            # cosine
            denom=(np.linalg.norm(q)*np.linalg.norm(emb))
            sim=float(np.dot(q,emb)/denom) if denom else 0
            scored.append({"chunk_id":item["chunk_id"],"content":item["content"],"similarity":sim})
        scored.sort(key=lambda x: x["similarity"], reverse=True)
        return scored[:k]
