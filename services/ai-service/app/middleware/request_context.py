import uuid, time, json, contextvars
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
request_id_ctx = contextvars.ContextVar("request_id", default=None)
facts_ctx = contextvars.ContextVar("facts", default=None)
def get_request_id(): return request_id_ctx.get()
def put_fact(k,v):
    d=facts_ctx.get()
    if d is None: d={}; facts_ctx.set(d)
    d[k]=v
class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get("X-Request-Id") or str(uuid.uuid4())
        request_id_ctx.set(rid)
        facts_ctx.set({})
        start=time.time()
        response = await call_next(request)
        response.headers["X-Request-Id"]=rid
        dur=int((time.time()-start)*1000)
        line={"requestId":rid,"method":request.method,"path":request.url.path,"status":response.status_code,"durationMs":dur}
        line.update(facts_ctx.get() or {})
        print(json.dumps(line))
        # persist to DB asynchronously - best effort
        try:
            from app.db.session import SessionLocal
            from app.db.models.request_log import RequestLog
            db=SessionLocal()
            rl=RequestLog(request_id=rid, method=request.method, path=request.url.path, status=response.status_code, duration_ms=dur, facts_json=json.dumps(facts_ctx.get() or {}))
            db.add(rl); db.commit(); db.close()
        except Exception as e:
            print(f"request log persist failed: {e}")
        return response
