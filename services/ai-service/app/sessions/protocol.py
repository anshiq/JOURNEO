from pydantic import BaseModel
from typing import Any, Literal, Optional


class StartMessage(BaseModel):
    type: Literal['start'] = 'start'
    mode: Literal['live', 'test'] = 'live'
    campaignId: Optional[str] = None
    journeyId: Optional[str] = None
    devToken: Optional[str] = None


class ChoiceMessage(BaseModel):
    type: Literal['choice'] = 'choice'
    handle: Optional[str] = None
    payload: Optional[Any] = None


class RestartMessage(BaseModel):
    type: Literal['restart'] = 'restart'


class GotoMessage(BaseModel):
    type: Literal['goto'] = 'goto'
    nodeId: str


class QueryMessage(BaseModel):
    type: Literal['query'] = 'query'
    query: str
    nodeId: Optional[str] = None


class ChoiceOption(BaseModel):
    handle: str
    label: str


class NodeFrame(BaseModel):
    type: Literal['node'] = 'node'
    sessionId: str
    graphVersion: int
    stepIndex: int
    node: dict
    choices: list[ChoiceOption]


class EndFrame(BaseModel):
    type: Literal['end'] = 'end'
    sessionId: str
    reason: str


class StaleFrame(BaseModel):
    type: Literal['graph-stale'] = 'graph-stale'
    journeyId: str
    serverVersion: int


class ErrorFrame(BaseModel):
    type: Literal['error'] = 'error'
    code: str
    message: str


class QueryResultFrame(BaseModel):
    type: Literal['query_result'] = 'query_result'
    sessionId: str
    decision: str
    targetNodeId: Optional[str] = None
    targetNodeType: Optional[str] = None
    targetNodeSummary: Optional[str] = None
    targetNodeDetails: Optional[Any] = None
    answer: Optional[str] = None
    citations: Any = None
    confidence: float = 0.5
    reason: str = ""


class GraphChangedWebhook(BaseModel):
    journeyId: str
    campaignId: Optional[str] = None
    version: int
