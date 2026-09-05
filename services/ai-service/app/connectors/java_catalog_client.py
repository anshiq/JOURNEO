import httpx
from app.config import settings
from functools import lru_cache
import time
_cache={}
_ttl=60
async def get_catalog(campaign_id: str, metrics="ctr,cpa,roas,reach,frequency", from_date=None, to_date=None):
    key=(campaign_id,metrics,from_date,to_date)
    now=time.time()
    if key in _cache and now - _cache[key][0] < _ttl:
        return _cache[key][1]
    url=f"{settings.analytics_service_url}/catalog/metrics/{campaign_id}?metrics={metrics}"
    if from_date: url+=f"&from={from_date}"
    if to_date: url+=f"&to={to_date}"
    async with httpx.AsyncClient(timeout=5) as c:
        r=await c.get(url)
        r.raise_for_status()
        data=r.json()
        _cache[key]=(now,data)
        return data

def format_catalog_context(catalog: dict):
    lines=[]
    for m in catalog.get("metrics",[]):
        lines.append(f"{m.get('label')} ({m.get('key')}): {m.get('value')} [was {m.get('previous_value')}] — definition: {m.get('definition')} unit: {m.get('unit')}")
    window=catalog.get("window",{})
    header=f"Campaign {catalog.get('campaign_id')} window {window.get('from')} to {window.get('to')}"
    return header + "\n" + "\n".join(lines)
