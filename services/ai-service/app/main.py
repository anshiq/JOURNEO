import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.middleware.request_context import RequestContextMiddleware, get_request_id
from app.db.session import engine, Base
from app.db.models.request_log import RequestLog
from app.db.models.knowledge import KnowledgeSource, DocumentChunk
from app.db.models.proposals import ActionProposal
from app.db.models.anomaly import AnomalyEvent
from app.db.models.eval import EvalRun
from sqlalchemy import text

app=FastAPI(title="Journeo AI Service", version="0.1.0")

app.add_middleware(RequestContextMiddleware)
_cors_origins=[o.strip() for o in (os.environ.get("CORS_ALLOWED_ORIGINS","*").split(",")) if o.strip()] or ["*"]
app.add_middleware(CORSMiddleware, allow_origins=_cors_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def startup():
    # create tables
    try:
        # ensure vector extension
        with engine.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
    except Exception as e:
        print(f"extension failed {e}")
    Base.metadata.create_all(bind=engine)
    # ensure embeddings table
    try:
        from app.rag.vectorstore import ensure_vector_extension
        ensure_vector_extension()
    except: pass
    # start scheduler for anomaly
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        import httpx
        from app.config import settings
        from app.graphs.anomaly_graph import anomaly_graph
        from app.db.session import SessionLocal
        import asyncio
        async def periodic_scan():
            # scan campaign-c and campaign-b
            for cid in ["campaign-c","campaign-b","campaign-d"]:
                try:
                    out=await anomaly_graph.ainvoke({"campaign_id":cid})
                except Exception as e:
                    print(f"periodic scan {cid} failed {e}")
        def job():
            import asyncio
            try: asyncio.run(periodic_scan())
            except: pass
        sched=BackgroundScheduler(daemon=True)
        sched.add_job(job, 'interval', minutes=int(settings.anomaly_scan_interval_minutes))
        def self_ping_job():
            raw=(settings.self_ping_url or "").strip()
            if not settings.self_ping_enabled or not raw:
                return
            try:
                urls=[u.strip() for u in raw.split(",") if u.strip()]
                targets=[]
                for u in urls:
                    targets.append(u)
                    targets.append(u.rstrip("/") + "/health")
                with httpx.Client(timeout=20, follow_redirects=True) as client:
                    for target in targets:
                        try:
                            resp=client.get(target)
                            print(f"self ping {target} -> {resp.status_code}")
                        except Exception as e:
                            print(f"self ping {target} failed {e}")
            except Exception as e:
                print(f"self ping failed {e}")
        if settings.self_ping_enabled and (settings.self_ping_url or "").strip():
            sched.add_job(self_ping_job, 'interval', minutes=int(settings.self_ping_interval_minutes))
            print(f"Self ping scheduler started every {settings.self_ping_interval_minutes} minutes")
        sched.start()
        print("Anomaly scheduler started")
    except Exception as e:
        print(f"scheduler failed {e}")

from app.routers import decision_nodes, knowledge, optimizer, studio_ai, anomaly, eval, sessions, query
app.include_router(decision_nodes.router)
app.include_router(knowledge.router)
app.include_router(optimizer.router)
app.include_router(studio_ai.router)
app.include_router(anomaly.router)
app.include_router(eval.router)
app.include_router(sessions.router)
app.include_router(query.router)

@app.get("/health")
async def health(): return {"status":"ok"}

@app.get("/internal/logs")
async def internal_logs(requestId: str):
    from app.db.session import SessionLocal
    db=SessionLocal()
    rows=db.query(RequestLog).filter(RequestLog.request_id==requestId).all()
    out=[{"service":"ai-service","requestId":r.request_id,"method":r.method,"path":r.path,"status":r.status,"durationMs":r.duration_ms,"factsJson":r.facts_json,"createdAt":r.created_at.isoformat() if r.created_at else None} for r in rows]
    db.close()
    return out

@app.get("/")
async def root(): return {"service":"ai-service","docs":"/docs"}
