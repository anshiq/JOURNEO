import re
from typing import Dict, Any, List
def flatten_numbers(obj, prefix=""):
    nums=set()
    if isinstance(obj, dict):
        for k,v in obj.items():
            nums.update(flatten_numbers(v, prefix+k+"."))
    elif isinstance(obj, list):
        for v in obj: nums.update(flatten_numbers(v, prefix))
    elif isinstance(obj, (int,float)):
        nums.add(float(obj)); nums.add(round(float(obj),2))
        # also string forms
    elif isinstance(obj, str):
        # try parse numbers in strings?
        pass
    return nums

def extract_numbers(text: str):
    return [float(x) for x in re.findall(r"-?\d+\.?\d*%?", text.replace(",",""))]

def check_grounding(source_snapshot: Dict[str,Any], rationale: str, tolerance=0.1):
    allowed=flatten_numbers(source_snapshot)
    # also extract numbers from snapshot stringified for easier matching
    # Build set with tolerance
    found=extract_numbers(rationale)
    violations=[]
    for n in found:
        # check if any allowed number is close within tolerance or exact integer match
        ok=False
        for a in allowed:
            if abs(a-n) <= max(tolerance, abs(a)*0.01) + 1e-9:
                ok=True; break
            # also allow derived percentages
        if not ok:
            # allow small common numbers like 1,2,3 if not critical?
            # We flag only if number looks like metric value
            if abs(n) > 5:  # heuristic: ignore small counts
                violations.append(n)
    return {"grounded": len(violations)==0, "violations":violations, "allowed_sample": sorted(list(allowed))[:20]}

def guardrail_check_snapshot(snapshot: Dict[str,Any], proposals: List[Dict[str,Any]], mode="flag"):
    results=[]
    for p in proposals:
        rationale=p.get("rationale","")
        res=check_grounding(snapshot, rationale)
        status="pass" if res["grounded"] else ("reject" if mode=="reject" else "flag")
        results.append({"proposal":p, "guardrail_status":status, "details":res})
    return results
