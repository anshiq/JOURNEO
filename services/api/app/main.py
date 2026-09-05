import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.db.session import Base, engine
from app.middleware.request_context import RequestContextMiddleware

app = FastAPI(title="Journeo API", version="1.0.0")
app.add_middleware(RequestContextMiddleware)
_cors_origins = [o.strip() for o in (os.environ.get("CORS_ALLOWED_ORIGINS", "*").split(",")) if o.strip()] or ["*"]
app.add_middleware(CORSMiddleware, allow_origins=_cors_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
@app.on_event("startup")
async def startup():
    try:
        with engine.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
    except Exception as e:
        print(f"extension failed {e}")
    Base.metadata.create_all(bind=engine)
    try:
        from app.rag.vectorstore import ensure_vector_extension
        ensure_vector_extension()
    except Exception:
        pass
    try:
        from app.config import settings
        if settings.seed_on_start or settings.demo_data_seed:
            from app.seeds.loader import load_all
            load_all(reset=(settings.seed_reset or settings.demo_data_reset))
    except Exception as e:
        print(f"seed failed {e}")
    try:
        import asyncio

        import httpx
        from apscheduler.schedulers.background import BackgroundScheduler

        from app.config import settings
        from app.graphs.anomaly_graph import anomaly_graph
        async def periodic_scan():
            for cid in ["apple-iphone-16-pro", "nike-air-zoom-pegasus-41", "tesla-model-y-2026"]:
                try:
                    await anomaly_graph.ainvoke({"campaign_id": cid})
                except Exception as e:
                    print(f"periodic scan {cid} failed {e}")
        def job():
            try:
                asyncio.run(periodic_scan())
            except Exception:
                pass
        sched = BackgroundScheduler(daemon=True)
        sched.add_job(job, "interval", minutes=int(settings.anomaly_scan_interval_minutes))
        def keepalive_job():
            raw = (settings.keepalive_urls or "").strip()
            if not settings.keepalive_enabled or not raw:
                return
            targets = [u.strip().rstrip("/") for u in raw.split(",") if u.strip()]
            with httpx.Client(timeout=20, follow_redirects=True) as client:
                for target in targets:
                    try:
                        resp = client.get(target)
                        print(f"keepalive ping {target} -> {resp.status_code}")
                    except Exception as e:
                        print(f"keepalive ping {target} failed {e}")
        if settings.keepalive_enabled and (settings.keepalive_urls or "").strip():
            sched.add_job(keepalive_job, "interval", minutes=int(settings.keepalive_interval_minutes))
            print(f"Keepalive scheduler started every {settings.keepalive_interval_minutes} minutes for {settings.keepalive_urls}")
        sched.start()
        print("Anomaly scheduler started")
    except Exception as e:
        print(f"scheduler failed {e}")
from app.routers import (
    analytics,
    anomaly,
    campaigns,
    connectors,
    decision_nodes,
    eval,
    files,
    knowledge,
    optimizer,
    query,
    sessions,
    studio_ai,
    trace,
    vision,
)

app.include_router(campaigns.router)
app.include_router(files.router)
app.include_router(trace.router)
app.include_router(analytics.router)
app.include_router(connectors.router)
app.include_router(decision_nodes.router)
app.include_router(knowledge.router)
app.include_router(optimizer.router)
app.include_router(studio_ai.router)
app.include_router(anomaly.router)
app.include_router(eval.router)
app.include_router(sessions.router)
app.include_router(query.router)
app.include_router(vision.router)
@app.get("/health")
async def health():
    return {"status": "ok"}
@app.get("/internal/logs")
async def internal_logs(requestId: str):
    from app.db.models.request_log import RequestLog
    from app.db.session import SessionLocal
    db = SessionLocal()
    rows = db.query(RequestLog).filter(RequestLog.request_id == requestId).all()
    out = [{"service": "api", "requestId": r.request_id, "method": r.method, "path": r.path, "status": r.status, "durationMs": r.duration_ms, "factsJson": r.facts_json, "createdAt": r.created_at.isoformat() if r.created_at else None} for r in rows]
    db.close()
    return out
@app.get("/")
async def root():
    return {"service": "api", "docs": "/docs"}
