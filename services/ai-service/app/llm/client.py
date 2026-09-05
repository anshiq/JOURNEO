from langchain_openai import ChatOpenAI
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
