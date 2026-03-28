"""
llm_service.py
──────────────
Centralised LLM factory.
Returns the configured LLM (Gemini) as a LangChain ChatModel.
Keeps module-level singletons to avoid re-initialising on every request.
"""

from __future__ import annotations
from functools import lru_cache
from loguru import logger

from app.config import settings

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage
from langchain_core.outputs import ChatResult, ChatGeneration
from typing import List, Optional, Any

import asyncio


class MockLLM(BaseChatModel):
    """A minimal mock LLM that returns placeholder values when API keys are missing."""

    async def _agenerate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> ChatResult:
        """Async version — minimal latency for mock responses."""
        await asyncio.sleep(0.5)
        return self._generate(messages, stop, run_manager, **kwargs)

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> ChatResult:
        prompt_str = str(messages).lower()

        if "pulitzer prize" in prompt_str:
            content = (
                '{\n  "headline": "Mock Article: API Key Required",\n'
                '  "subheadline": "The system is running in fallback mode.",\n'
                '  "article": "This is a mock article. Please update GOOGLE_API_KEY in backend/.env.",\n'
                '  "sections": []\n}'
            )
        elif "answer strictly" in prompt_str or "question:" in prompt_str:
            content = (
                "This is a mock answer. No valid GOOGLE_API_KEY was found. "
                "Please add a valid key to your backend/.env file."
            )
        else:
            content = (
                '{\n  "summary": "Mock summary — no valid API key provided.",\n'
                '  "key_facts": ["API Key missing or invalid.", "Running in Mock Mode."],\n'
                '  "entities": [{"name": "Mock System", "type": "ORGANIZATION", "context": "Fallback mode"}],\n'
                '  "timeline": [],\n  "statistics": []\n}'
            )

        message = AIMessage(content=content)
        return ChatResult(generations=[ChatGeneration(message=message)])

    @property
    def _llm_type(self) -> str:
        return "mock-llm"


def _build_gemini_llm(max_tokens: int = 2048, temperature: float = 0.3):
    """
    Internal helper — creates a fresh ChatGoogleGenerativeAI instance.
    Falls back to MockLLM if the API key is missing or initialisation fails.
    """
    import os
    if os.getenv("FORCE_MOCK_LLM") == "true":
        logger.info("FORCE_MOCK_LLM=true → using MockLLM.")
        return MockLLM()

    if not settings.google_api_key or settings.google_api_key in (
        "", "your-google-api-key-here"
    ):
        logger.warning("No valid GOOGLE_API_KEY → using MockLLM.")
        return MockLLM()

    model_name = settings.gemini_model or "gemini-2.0-flash"
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI

        logger.info(
            "Initialising Gemini LLM '{}' | max_tokens={} temperature={}",
            model_name, max_tokens, temperature,
        )
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=settings.google_api_key,
            temperature=temperature,
            max_output_tokens=max_tokens,
            convert_system_message_to_human=True,
        )
    except Exception as exc:
        logger.error(
            "Failed to initialise Gemini '{}': {} → MockLLM.", model_name, exc
        )
        return MockLLM()


@lru_cache(maxsize=1)
def get_llm():
    """
    Analysis / article LLM singleton.
    Higher token budget suitable for structured JSON responses.
    """
    logger.info("get_llm() called (analysis LLM).")
    return _build_gemini_llm(max_tokens=2048, temperature=0.3)


@lru_cache(maxsize=1)
def get_fast_llm():
    """
    RAG Q&A LLM singleton — optimised for sub-2s responses.
    Small token budget + lower temperature = faster, more deterministic answers.
    """
    logger.info("get_fast_llm() called (RAG LLM).")
    return _build_gemini_llm(max_tokens=512, temperature=0.1)
