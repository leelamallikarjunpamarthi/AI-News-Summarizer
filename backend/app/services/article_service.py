"""
article_service.py
──────────────────
Generates a publication-ready news article from document insights.
Uses the article prompt and the configured LLM.
"""

from __future__ import annotations
import json
from loguru import logger

from app.services.llm_service import get_llm
from app.prompts.article_prompt import article_prompt
from app.models.response_models import ArticleResponse, ArticleSection
from app.utils.llm_utils import extract_text


def generate_article(
    document_id: str,
    insights: dict,
    user_profile: str = "general",
    tone: str = "neutral",
    focus: str = "",
) -> ArticleResponse:
    """
    Generate a structured news article from extracted insights, tailored to a user profile.

    Args:
        document_id: Source document ID.
        insights: Dict containing summary, key_facts, entities, timeline, statistics.
        user_profile: Target audience profile.
        tone: Writing tone (neutral | investigative | feature | breaking-news).
        focus: Optional focus area or angle.

    Returns:
        ArticleResponse with headline, article body, and structured sections.
    """
    logger.info(f"Generating article for doc '{document_id}' | profile={user_profile} | tone={tone}")

    # Serialise insights for the prompt
    insights_text = _format_insights(insights)

    llm = get_llm()
    chain = article_prompt | llm
    raw = chain.invoke({
        "user_profile": user_profile,
        "tone": tone,
        "focus": focus or "general overview",
        "insights": insights_text
    })
    raw_text = extract_text(raw.content) if hasattr(raw, "content") else extract_text(raw)

    return _parse_article(document_id, raw_text)


def _format_insights(insights: dict) -> str:
    """
    Convert the insights dict to a human-readable string for the prompt.
    """
    lines = []

    if summary := insights.get("summary"):
        lines.append(f"SUMMARY:\n{summary}")

    if key_facts := insights.get("key_facts"):
        lines.append("KEY FACTS:")
        for fact in key_facts:
            lines.append(f"  • {fact}")

    if entities := insights.get("entities"):
        lines.append("NOTABLE ENTITIES:")
        for e in entities:
            if isinstance(e, dict):
                lines.append(f"  • {e.get('name', '')} ({e.get('type', '')}): {e.get('context', '')}")
            else:
                lines.append(f"  • {e}")

    if timeline := insights.get("timeline"):
        lines.append("TIMELINE:")
        for t in timeline:
            if isinstance(t, dict):
                lines.append(f"  • {t.get('date', '')}: {t.get('event', '')}")
            else:
                lines.append(f"  • {t}")

    if stats := insights.get("statistics"):
        lines.append("STATISTICS:")
        for s in stats:
            if isinstance(s, dict):
                lines.append(f"  • {s.get('value', '')}: {s.get('context', '')}")
            else:
                lines.append(f"  • {s}")

    return "\n\n".join(lines)


def _parse_article(document_id: str, raw_text: str) -> ArticleResponse:
    """Parse the LLM JSON output into an ArticleResponse."""
    raw_text = raw_text.strip()
    if raw_text.startswith("```"):
        raw_text = raw_text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

    try:
        data = json.loads(raw_text)
    except json.JSONDecodeError:
        logger.warning("Article LLM response was not valid JSON. Using raw text as article body.")
        data = {}

    sections = [
        ArticleSection(title=s.get("title", ""), content=s.get("content", ""))
        for s in data.get("sections", [])
        if s.get("content")
    ]

    article_body = data.get("article", raw_text)
    word_count = len(article_body.split())

    return ArticleResponse(
        document_id=document_id,
        headline=data.get("headline", "Untitled Article"),
        subheadline=data.get("subheadline", ""),
        article=article_body,
        sections=sections,
        word_count=word_count,
    )
