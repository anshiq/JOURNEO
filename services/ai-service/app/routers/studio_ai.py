from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from app.agents.studio_ai_agent import chat
from app.connectors.registry import dispatch

router=APIRouter(prefix="/v1/studio-ai", tags=["studio-ai"])

class ChatReq(BaseModel):
    messages: List[dict]
    campaign_id: Optional[str]=None

@router.post("/chat")
async def chat_endpoint(req: ChatReq):
    res=await chat(req.messages, campaign_id=req.campaign_id)
    return res

class ActionReq(BaseModel):
    platform: str
    action: str
    params: dict

@router.post("/actions/execute")
async def execute_action(req: ActionReq):
    res=await dispatch(req.platform, req.action, req.params)
    return res
