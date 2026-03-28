"""
translation_service.py
──────────────────────
Provides context-aware, business-specialized translation into vernacular languages.
"""

from __future__ import annotations
import json
from loguru import logger

from app.services.llm_service import get_llm
from app.prompts.translation_prompt import translation_prompt


def translate_content(
    text: str,
    target_language: str
) -> dict:
    """
    Translate news content into a vernacular language with business context.
    """
    logger.info(f"Translating to {target_language}")

    llm = get_llm()
    chain = translation_prompt | llm
    try:
        raw = chain.invoke({
            "target_language": target_language,
            "text": text
        })
        raw_text = raw.content if hasattr(raw, "content") else str(raw)
        return _parse_translation(raw_text)
    except Exception as e:
        logger.error(f"Translation failed: {e}")
        return {"error": str(e)}


def _parse_translation(raw_text: str) -> dict:
    """Parse the LLM JSON output."""
    raw_text = raw_text.strip()
    if raw_text.startswith("```"):
        raw_text = raw_text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        logger.warning("Translation LLM response was not valid JSON.")
        return {"raw_content": raw_text}
