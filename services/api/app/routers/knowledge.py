from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from pydantic import BaseModel
from typing import List, Optional
from app.db.session import SessionLocal
from app.db.models.knowledge import KnowledgeSource, DocumentChunk
from app.rag.loaders import load_pdf_bytes, load_web
from app.rag.chunking import chunk_text
from app.rag.embeddings import get_embeddings
from app.rag.vectorstore import add_embeddings
from app.rag.retriever import retrieve
from sqlalchemy.orm import Session
import json

router=APIRouter(prefix="/v1/knowledge", tags=["knowledge"])

@router.post("/sources/pdf")
async def ingest_pdf(file: UploadFile = File(...), title: str = Form(None)):
    data=await file.read()
    text=load_pdf_bytes(data)
    db=SessionLocal()
    src=KnowledgeSource(type="pdf", title=title or file.filename, uri=file.filename)
    db.add(src); db.commit(); db.refresh(src)
    chunks=chunk_text(text, is_qa=False)
    emb_model=get_embeddings()
    embs=emb_model.embed_documents(chunks)
    sid=src.id
    for idx, ch in enumerate(chunks):
        dc=DocumentChunk(source_id=sid, chunk_index=idx, content=ch)
        db.add(dc); db.flush()
        add_embeddings([(dc.id, ch)], [embs[idx]])
    db.commit(); sid2=sid; db.close()
    return {"source_id":sid2,"chunks":len(chunks)}

@router.post("/sources/web")
async def ingest_web(payload: dict):
    url=payload.get("url"); title=payload.get("title", url)
    text=load_web(url)
    db=SessionLocal()
    src=KnowledgeSource(type="web", title=title, uri=url)
    db.add(src); db.commit(); db.refresh(src)
    chunks=chunk_text(text)
    emb_model=get_embeddings()
    embs=emb_model.embed_documents(chunks)
    sid=src.id
    for idx,ch in enumerate(chunks):
        dc=DocumentChunk(source_id=sid, chunk_index=idx, content=ch)
        db.add(dc); db.flush()
        add_embeddings([(dc.id,ch)],[embs[idx]])
    db.commit(); sid2=sid; db.close()
    return {"source_id":sid2,"chunks":len(chunks)}

@router.post("/sources/qa")
async def ingest_qa(payload: dict):
    question=payload.get("question",""); answer=payload.get("answer","")
    qa=f"Q: {question}\nA: {answer}"
    db=SessionLocal()
    src=KnowledgeSource(type="qa", title=question[:80], uri="qa")
    db.add(src); db.commit(); db.refresh(src)
    chunks=chunk_text(qa, is_qa=True)
    emb_model=get_embeddings()
    embs=emb_model.embed_documents(chunks)
    sid=src.id
    for idx,ch in enumerate(chunks):
        dc=DocumentChunk(source_id=sid, chunk_index=idx, content=ch)
        db.add(dc); db.flush()
        add_embeddings([(dc.id,ch)],[embs[idx]])
    db.commit(); sid2=sid; db.close()
    return {"source_id":sid2,"chunks":len(chunks)}

@router.get("/sources")
async def list_sources():
    db=SessionLocal()
    srcs=db.query(KnowledgeSource).all()
    out=[{"id":s.id,"type":s.type,"title":s.title,"uri":s.uri,"created_at":s.created_at.isoformat() if s.created_at else None} for s in srcs]
    db.close()
    return out

@router.delete("/sources/{sid}")
async def delete_source(sid: int):
    db=SessionLocal()
    src=db.query(KnowledgeSource).filter(KnowledgeSource.id==sid).first()
    if not src: raise HTTPException(404,"not found")
    # delete chunks
    db.query(DocumentChunk).filter(DocumentChunk.source_id==sid).delete()
    # also delete embeddings
    from app.db.session import engine
    from sqlalchemy import text
    try:
        with engine.begin() as c:
            c.execute(text("DELETE FROM document_embeddings WHERE chunk_id IN (SELECT id FROM document_chunks WHERE source_id=:sid)"),{"sid":sid})
    except: pass
    db.delete(src); db.commit(); db.close()
    return {"ok":True}

@router.post("/query")
async def query(payload: dict):
    q=payload.get("query","")
    k=int(payload.get("k",4))
    ret=retrieve(q, k=k)
    if not ret.get("grounded"):
        return {"grounded":False,"answer":"Not grounded - no relevant knowledge found","citations":[],"reason":ret.get("reason")}
    # synthesize answer
    from app.llm.client import get_llm, llm_available
    context_str="\n".join([f"[{i+1}] {r['content'][:500]}" for i,r in enumerate(ret["results"])])
    prompt=f"Answer based ONLY on context. Cite sources like [1].\nContext:\n{context_str}\n\nQuestion: {q}"
    if llm_available():
        try:
            llm=get_llm()
            res=await llm.ainvoke(prompt)
            ans=res.content
        except Exception as e:
            ans=ret["results"][0]["content"][:600]
    else:
        ans=ret["results"][0]["content"][:600]
    cits=[{"chunk_id":r["chunk_id"],"snippet":r["content"][:200],"similarity":r["similarity"]} for r in ret["results"]]
    return {"grounded":True,"answer":ans,"citations":cits}
