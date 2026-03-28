"""
briefing_service.py
───────────────────
Synthesizes multiple news articles into a single intelligence briefing.
"""

from __future__ import annotations
import json
from loguru import logger

from app.services.llm_service import get_llm
from app.prompts.briefing_prompt import briefing_prompt
from app.services.insight_service import load_analysis


async def generate_briefing(
    document_ids: list[str],
    user_profile: str = "general"
) -> dict:
    """
    Synthesize insights from multiple documents.
    """
    logger.info(f"Generating briefing for {len(document_ids)} docs | profile={user_profile}")

    aggregated_insights = []
    for doc_id in document_ids:
        analysis = load_analysis(doc_id)
        if analysis:
            aggregated_insights.append({
                "document_id": doc_id,
                "summary": analysis.get("summary", ""),
                "key_facts": analysis.get("key_facts", []),
                "entities": analysis.get("entities", []),
                "sentiment": analysis.get("sentiment", "neutral")
            })

    if not aggregated_insights:
        return {"error": "No insights found for the provided document IDs."}

    insights_json = json.dumps(aggregated_insights, indent=2)

    llm = get_llm()
    chain = briefing_prompt | llm
    try:
        raw = await chain.ainvoke({
            "user_profile": user_profile,
            "aggregated_insights": insights_json
        })
        raw_text = raw.content if hasattr(raw, "content") else str(raw)
        return _parse_briefing(raw_text)
    except Exception as e:
        logger.error(f"Briefing generation failed: {e}")
        return {"error": str(e)}


def _parse_briefing(raw_text: str) -> dict:
    """Parse the LLM JSON output."""
    raw_text = raw_text.strip()
    if raw_text.startswith("```"):
        raw_text = raw_text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        logger.warning("Briefing LLM response was not valid JSON.")
        return {"raw_content": raw_text}
