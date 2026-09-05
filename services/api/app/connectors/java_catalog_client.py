from app.db.session import SessionLocal
from app.modules.analytics import service as S

_cache = {}
import time

_ttl = 60
async def get_catalog(campaign_id: str, metrics="ctr,cpa,roas,reach,frequency", from_date=None, to_date=None):
    key = (campaign_id, metrics, from_date, to_date)
    now = time.time()
    if key in _cache and now - _cache[key][0] < _ttl:
        return _cache[key][1]
    db = SessionLocal()
    try:
        data = S.catalog(db, campaign_id, metrics, from_date, to_date)
        _cache[key] = (now, data)
        return data
    finally:
        db.close()
def format_catalog_context(catalog: dict):
    return S.format_catalog_context(catalog)
