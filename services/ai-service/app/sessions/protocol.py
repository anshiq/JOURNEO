from pydantic import BaseModel, Field, model_validator
from typing import Any, Literal, Optional


class StartMessage(BaseModel):
    type: Literal['start'] = 'start'
    mode: Literal['live', 'test'] = 'live'
    campaignId: Optional[str] = None
    journeyId: Optional[str] = None
    devToken: Optional[str] = None
    resumeThread: Optional[bool] = None
    device: Optional[Literal['mobile', 'tablet', 'desktop']] = None


class ChoiceMessage(BaseModel):
    type: Literal['choice'] = 'choice'
    handle: Optional[str] = None
    payload: Optional[Any] = None


class TimeoutMessage(BaseModel):
    type: Literal['timeout'] = 'timeout'
    stepIndex: Optional[int] = None
    screenId: Optional[str] = None


class BackMessage(BaseModel):
    type: Literal['back'] = 'back'


class RestartMessage(BaseModel):
    type: Literal['restart'] = 'restart'


class GotoMessage(BaseModel):
    type: Literal['goto'] = 'goto'
    screenId: Optional[str] = None
    nodeId: Optional[str] = None

    @model_validator(mode='after')
    def validate_target(self):
        if bool(self.screenId) == bool(self.nodeId):
            raise ValueError('exactly one of screenId or nodeId is required')
        return self


class QueryMessage(BaseModel):
    type: Literal['query'] = 'query'
    queryId: Optional[str] = None
    query: str
    screenId: Optional[str] = None
    blockId: Optional[str] = None
    nodeId: Optional[str] = None


class ChoiceOption(BaseModel):
    handle: str
    label: str
    source: str = 'advance'
    blockId: Optional[str] = None


class ScreenFrame(BaseModel):
    type: Literal['screen'] = 'screen'
    sessionId: str
    graphVersion: int
    stepIndex: int
    screen: dict
    blocks: list[dict] = Field(default_factory=list)
    choices: list[ChoiceOption] = Field(default_factory=list)
    timeoutMs: Optional[int] = None


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
    queryId: Optional[str] = None
    decision: str
    targetNodeId: Optional[str] = None
    targetNodeType: Optional[str] = None
    targetNodeSummary: Optional[str] = None
    targetNodeDetails: Optional[Any] = None
    answer: Optional[str] = None
    citations: Any = None
    confidence: float = 0.5
    reason: str = ""
    suggestedQuestions: Any = None


class ChatHistoryFrame(BaseModel):
    type: Literal['chat_history'] = 'chat_history'
    sessionId: str
    messages: list[dict] = Field(default_factory=list)


class GraphChangedWebhook(BaseModel):
    journeyId: str
    campaignId: Optional[str] = None
    version: int
