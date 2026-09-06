import asyncio
import uuid


class GraphCache:
    def __init__(self):
        self._items = {}
        self._lock = asyncio.Lock()

    async def get(self, journey_id):
        async with self._lock:
            return self._items.get(journey_id)

    async def put(self, journey_id, version, graph):
        async with self._lock:
            self._items[journey_id] = (version, graph)

    async def invalidate(self, journey_id, version):
        async with self._lock:
            cur = self._items.get(journey_id)
            if cur is None or version > cur[0]:
                self._items.pop(journey_id, None)
                return True
            return False


def new_session(journey_id, campaign_id, mode, graph_version, entry_id):
    return {
        "id": uuid.uuid4().hex,
        "journey_id": journey_id,
        "campaign_id": campaign_id,
        "mode": mode,
        "graph_version": graph_version,
        "current_id": entry_id,
        "profile": {},
        "history": [],
        "step_index": 0,
        "status": "running",
    }


class SessionStore:
    def __init__(self):
        self._sessions = {}
        self._sockets = {}
        self._lock = asyncio.Lock()

    async def create(self, journey_id, campaign_id, mode, graph_version, entry_id):
        sess = new_session(journey_id, campaign_id, mode, graph_version, entry_id)
        async with self._lock:
            self._sessions[sess["id"]] = sess
        return sess

    async def get(self, session_id):
        async with self._lock:
            return self._sessions.get(session_id)

    async def attach(self, session_id, websocket):
        async with self._lock:
            self._sockets[session_id] = websocket

    async def detach(self, session_id):
        async with self._lock:
            self._sockets.pop(session_id, None)

    async def test_sockets_for(self, journey_id):
        async with self._lock:
            out = []
            for sid, ws in self._sockets.items():
                sess = self._sessions.get(sid)
                if sess is not None and sess["journey_id"] == journey_id and sess["mode"] == "test":
                    out.append((sid, ws))
            return out
