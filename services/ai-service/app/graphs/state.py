from typing import TypedDict, List, Optional, Any
class DecisionState(TypedDict, total=False):
    journey_id: str
    node_id: str
    subtype: str
    campaign_id: str
    context: dict
    attempt: int
    max_attempts: int
    confidence: float
    outcome: str
    branch: str
    used_fallback: bool
    error: str
    kb_results: Any
