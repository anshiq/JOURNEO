import json
import random
from datetime import date, timedelta
from pathlib import Path

import yaml
from sqlalchemy import text

from app.db.models.analytics import DeliveryEvent, MetricDefinition
from app.db.models.connectors import MockCampaign
from app.db.models.journey import Campaign, Journey
from app.db.models.knowledge import DocumentChunk, KnowledgeSource
from app.db.session import Base, SessionLocal, engine

SEED_DIR = Path(__file__).resolve().parents[2] / "seeds"
def _load(name):
    p = SEED_DIR / name
    if not p.exists():
        return None
    return yaml.safe_load(p.read_text())
def load_all(reset=False):
    try:
        with engine.begin() as conn:
            try:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            except Exception:
                pass
            try:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
            except Exception:
                pass
    except Exception as e:
        print(f"seed extension failed {e}")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if reset:
            for m in (DeliveryEvent, MockCampaign):
                try:
                    db.query(m).delete()
                except Exception:
                    pass
            db.commit()
        defs = _load("metric_definitions.yaml") or []
        for d in defs:
            row = db.query(MetricDefinition).filter(MetricDefinition.key == d["key"]).first()
            if row:
                row.label = d.get("label", row.label)
                row.definition = d.get("definition", row.definition)
                row.unit = d.get("unit", row.unit)
                row.formula = d.get("formula", row.formula)
            else:
                db.add(MetricDefinition(key=d["key"], label=d.get("label", d["key"]), definition=d.get("definition", ""), unit=d.get("unit", ""), formula=d.get("formula")))
        db.commit()
        campaigns = _load("campaigns.yaml") or []
        for c in campaigns:
            row = db.query(Campaign).filter(Campaign.id == c["id"]).first()
            if not row:
                row = Campaign(id=c["id"])
                db.add(row)
            row.name = c.get("name", row.name)
            row.description = c.get("description", "")
            row.objective = c.get("objective", "")
            row.audience = c.get("audience", "")
            row.status = c.get("status", "ACTIVE")
            row.deleted_at = None
        db.commit()
        journeys = _load("journeys.yaml") or []
        for j in journeys:
            cid = j["campaignId"]
            graph = j.get("graph", {})
            graph_json = json.dumps(graph)
            row = db.query(Journey).filter(Journey.campaign_id == cid).order_by(Journey.created_at.asc()).first()
            if not row:
                row = Journey(campaign_id=cid, name=j.get("name", "Journey"), graph_json=graph_json, status=j.get("status", "PUBLISHED"), version=j.get("version", 1))
                db.add(row)
            else:
                if row.graph_json != graph_json:
                    row.graph_json = graph_json
                    row.version = max(1, row.version or 1) + 1
                row.status = j.get("status", row.status)
                if j.get("name"):
                    row.name = j["name"]
        db.commit()
        analytics_cfg = _load("analytics.yaml") or {}
        seed = int((analytics_cfg or {}).get("seed", 42))
        days = int((analytics_cfg or {}).get("days", 91))
        for entry in (analytics_cfg or {}).get("campaigns", []):
            cid = entry["id"]
            if db.query(DeliveryEvent).filter(DeliveryEvent.campaign_id == cid).count() > 0 and not reset:
                continue
            if reset:
                db.query(DeliveryEvent).filter(DeliveryEvent.campaign_id == cid).delete()
                db.commit()
            rnd = random.Random(f"{seed}-{cid}")
            today = date.today()
            ctr_base = float(entry.get("ctr_base", 1.5))
            surge = bool(entry.get("surge", False))
            surge_days = int(entry.get("surge_days", 14))
            for i in range(days - 1, -1, -1):
                d = today - timedelta(days=i)
                imp = 8000 + rnd.randint(0, 4000)
                cb = ctr_base
                if surge and i < surge_days:
                    prog = (surge_days - i) / surge_days
                    imp = int(imp * (1 + prog * 0.8))
                    cb = 2.2 + prog * 1.1
                clicks = round(imp * cb / 100)
                conv = max(1, round(clicks * 0.11))
                spend = conv * (18 + rnd.random() * 5)
                freq = 1.8 + rnd.random() * 0.3
                db.add(DeliveryEvent(campaign_id=cid, platform="meta" if i % 2 == 0 else "google", date=d, impressions=imp, clicks=clicks, conversions=conv, spend=spend, ctr=cb, cpa=(spend / conv if conv else 0), roas=3.5 + rnd.random() + (1.2 if "apple" in cid else 0), frequency=freq, viewability=68 + rnd.random() * 10, reach=round(imp / freq) if freq else imp))
            db.commit()
        connectors = _load("connectors.yaml") or []
        for m in connectors:
            row = db.query(MockCampaign).filter(MockCampaign.id == m["id"]).first()
            if not row:
                row = MockCampaign(id=m["id"])
                db.add(row)
            row.platform = m.get("platform", "meta")
            row.external_id = m.get("external_id", m["id"])
            row.name = m.get("name", "Untitled")
            row.status = m.get("status", "ACTIVE")
            row.daily_budget = float(m.get("daily_budget", 100))
            row.raw_json = m.get("raw_json", "{}")
        db.commit()
        qa = _load("knowledge_qa.yaml") or []
        if qa:
            try:
                from app.rag.chunking import chunk_text
                from app.rag.embeddings import get_embeddings
                from app.rag.vectorstore import add_embeddings
                emb = get_embeddings()
                existing_titles = {r.title for r in db.query(KnowledgeSource).filter(KnowledgeSource.type == "qa").all()}
                for item in qa:
                    if item.get("question", "")[:80] in existing_titles and not reset:
                        continue
                    src = KnowledgeSource(type="qa", title=item["question"][:80], uri=item.get("campaign_id", "qa"))
                    db.add(src)
                    db.commit()
                    db.refresh(src)
                    chunks = chunk_text(f"Q: {item['question']}\nA: {item['answer']}", is_qa=True)
                    try:
                        embs = emb.embed_documents(chunks)
                    except Exception:
                        embs = [[0.0] * 384 for _ in chunks]
                    for idx, ch in enumerate(chunks):
                        dc = DocumentChunk(source_id=src.id, chunk_index=idx, content=ch)
                        db.add(dc)
                        db.flush()
                        try:
                            add_embeddings([(dc.id, ch)], [embs[idx]])
                        except Exception:
                            pass
                    db.commit()
            except Exception as e:
                print(f"qa seed skipped {e}")
    finally:
        db.close()
    print("seeds loaded")
if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--reset", action="store_true")
    args = ap.parse_args()
    load_all(reset=args.reset)
