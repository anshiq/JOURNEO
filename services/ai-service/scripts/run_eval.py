#!/usr/bin/env python3
import asyncio, json, pathlib, httpx, sys
async def main():
    base="http://localhost:8084"
    scenarios=[]
    p=pathlib.Path("tests/fixtures/eval_scenarios")
    if p.exists():
        for f in p.glob("*.json"):
            scenarios.append(json.loads(f.read_text()))
    if not scenarios:
        scenarios=[{"id":"sc1","campaign_id":"campaign-a","human_baseline":{"proposals":[{"action":"reallocate_budget"}]}}]
    async with httpx.AsyncClient(timeout=20) as c:
        r=await c.post(f"{base}/v1/eval/runs", json={"prompt_version":"v1","scenarios":scenarios})
        print(r.json())
if __name__=="__main__":
    asyncio.run(main())
