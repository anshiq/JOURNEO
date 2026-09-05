from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.llm.client import describe_image

router = APIRouter(prefix="/v1/vision", tags=["vision"])


class AltTextReq(BaseModel):
    imageUrl: str
    context: Optional[str] = None


@router.post("/alt-text")
async def alt_text(req: AltTextReq):
    instruction = "Write a concise, descriptive alt-text (under 15 words) for this image."
    if req.context:
        instruction += f" Context: {req.context}"
    try:
        text = describe_image(req.imageUrl, instruction)
    except Exception as e:
        return {"alt": "", "error": str(e)}
    return {"alt": text}
