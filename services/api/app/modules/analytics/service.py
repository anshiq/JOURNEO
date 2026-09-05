from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.db.models.analytics import DeliveryEvent, MetricDefinition


def _parse(d, default):
    from datetime import date as _d
    if d:
        return _d.fromisoformat(str(d))
    return default
def reach(db: Session, cid: str, from_date=None, to_date=None):
    f = _parse(from_date, date.today() - timedelta(days=30))
    t = _parse(to_date, date.today())
    events = db.query(DeliveryEvent).filter(DeliveryEvent.campaign_id == cid, DeliveryEvent.date >= f, DeliveryEvent.date <= t).order_by(DeliveryEvent.date.asc()).all()
    total_imp = sum(e.impressions for e in events)
    total_clicks = sum(e.clicks for e in events)
    total_spend = sum(e.spend for e in events)
    total_conv = sum(e.conversions for e in events)
    avg_ctr = (total_clicks / total_imp * 100) if total_imp else 0
    avg_cpa = (total_spend / total_conv) if total_conv else 0
    series = [{"date": e.date.isoformat(), "impressions": e.impressions, "clicks": e.clicks, "ctr": e.ctr, "cpa": e.cpa, "spend": e.spend, "frequency": e.frequency, "reach": e.reach} for e in events]
    return {"campaignId": cid, "window": {"from": f.isoformat(), "to": t.isoformat()}, "totals": {"impressions": total_imp, "clicks": total_clicks, "spend": total_spend, "conversions": total_conv, "ctr": avg_ctr, "cpa": avg_cpa}, "series": series}
def _avg(vals, fallback=0):
    vals = list(vals)
    return sum(vals) / len(vals) if vals else fallback
def catalog(db: Session, cid: str, metrics=None, from_date=None, to_date=None):
    f = _parse(from_date, date.today() - timedelta(days=7))
    t = _parse(to_date, date.today())
    events = db.query(DeliveryEvent).filter(DeliveryEvent.campaign_id == cid, DeliveryEvent.date >= f, DeliveryEvent.date <= t).all()
    if not events:
        events = db.query(DeliveryEvent).filter(DeliveryEvent.campaign_id == cid).order_by(DeliveryEvent.date.desc()).limit(7).all()
    avg_ctr = _avg([e.ctr for e in events])
    avg_cpa = _avg([e.cpa for e in events])
    avg_roas = _avg([e.roas for e in events])
    avg_reach = _avg([e.reach for e in events])
    avg_freq = _avg([e.frequency for e in events])
    avg_view = _avg([e.viewability for e in events])
    pf = f - timedelta(days=7)
    pt = f - timedelta(days=1)
    prev = db.query(DeliveryEvent).filter(DeliveryEvent.campaign_id == cid, DeliveryEvent.date >= pf, DeliveryEvent.date <= pt).all()
    prev_ctr = _avg([e.ctr for e in prev], avg_ctr)
    prev_cpa = _avg([e.cpa for e in prev], avg_cpa)
    wanted = set(str(metrics).split(",")) if metrics else {"ctr", "cpa", "roas", "reach", "frequency", "viewability"}
    defs = {d.key: d for d in db.query(MetricDefinition).all()}
    def mm(key, val, prevv, plat):
        d = defs.get(key)
        return {"key": key, "label": d.label if d else key, "definition": d.definition if d else "", "unit": d.unit if d else "", "value": round(val * 100) / 100, "previous_value": round(prevv * 100) / 100, "platform": plat, **({"formula": d.formula} if d and d.formula else {})}
    out = []
    if "ctr" in wanted:
        out.append(mm("ctr", avg_ctr, prev_ctr, "meta"))
    if "cpa" in wanted:
        out.append(mm("cpa", avg_cpa, prev_cpa, "meta"))
    if "roas" in wanted:
        out.append(mm("roas", avg_roas, avg_roas, "google"))
    if "reach" in wanted:
        out.append(mm("reach", avg_reach, avg_reach, "meta"))
    if "frequency" in wanted:
        out.append(mm("frequency", avg_freq, avg_freq, "meta"))
    if "viewability" in wanted:
        out.append(mm("viewability", avg_view, avg_view, "google"))
    return {"campaign_id": cid, "window": {"from": f.isoformat(), "to": t.isoformat()}, "metrics": out}
def format_catalog_context(catalog: dict):
    lines = []
    for m in catalog.get("metrics", []):
        lines.append(f"{m.get('label')} ({m.get('key')}): {m.get('value')} [was {m.get('previous_value')}] — definition: {m.get('definition')} unit: {m.get('unit')}")
    window = catalog.get("window", {})
    header = f"Campaign {catalog.get('campaign_id')} window {window.get('from')} to {window.get('to')}"
    return header + "\n" + "\n".join(lines)
