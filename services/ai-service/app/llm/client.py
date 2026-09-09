from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from app.config import settings
def get_llm(temperature=0.2, model=None):
    return ChatOpenAI(
        model=model or settings.openrouter_model,
        openai_api_key=settings.openrouter_api_key or "dummy",
        openai_api_base=settings.openrouter_base_url,
        temperature=temperature,
        max_tokens=800,
    )
def llm_available(): return bool(settings.openrouter_api_key)
def fallback_model():
    return getattr(settings, "openrouter_fallback_model", "") or "nvidia/nemotron-3-super-120b-a12b:free"
def invoke_with_fallback(prompt):
    try:
        return get_llm().invoke(prompt)
    except Exception as first:
        fb = fallback_model()
        if not fb or fb == settings.openrouter_model:
            raise first
        return get_llm(model=fb).invoke(prompt)
def describe_image(image_url, instruction="Write a concise, descriptive alt-text (under 15 words) for this image."):
    llm = get_llm(model=settings.openrouter_vision_model)
    message = HumanMessage(content=[
        {"type": "text", "text": instruction},
        {"type": "image_url", "image_url": {"url": image_url}},
    ])
    result = llm.invoke([message])
    return (result.content or "").strip().strip('"')
