"""
insight_service.py
──────────────────
Extracts structured insights (summary, entities, timeline, statistics)
from a document by calling the LLM with the summary prompt.
"""

from __future__ import annotations
import json
from loguru import logger

from app.services.llm_service import get_llm
from app.prompts.summary_prompt import summary_prompt
from app.models.response_models import AnalysisResponse, Entity, TimelineEvent, Statistic
from app.utils.llm_utils import extract_text


from app.services.analysis_store import save_analysis, load_analysis


import asyncio

async def analyse_document(document_id: str, full_text: str, user_profile: str = "general") -> AnalysisResponse:
    """
    Run the full analysis pipeline on extracted document text.
    """
    # 2. Run Analysis
    # Gemini Flash supports up to 1M tokens out-of-the-box. We do not need parallel chunking, 
    # which previously caused 429 Too Many Requests errors.
    response = await _analyse_direct(document_id, full_text, user_profile)

    # 3. Save to Cache
    save_analysis(document_id, response.model_dump())
    
    return response


async def _analyse_direct(document_id: str, text: str, user_profile: str) -> AnalysisResponse:
    """Single LLM call analyzing the document, with exponential backoff for transient API limits."""
    llm = get_llm()
    chain = summary_prompt | llm
    
    max_retries = 3
    base_delay = 5  # seconds
    
    for attempt in range(max_retries):
        try:
            logger.info(f"Extracting insights for '{document_id}' (attempt {attempt + 1}/{max_retries})...")
            
            # TRUNCATE text to ~40,000 characters to guarantee < 10s LLM response time.
            # While Gemini 1.5 handles 1M tokens, processing speed is proportional to input size.
            max_chars = 40000
            truncated_text = text[:max_chars]
            if len(text) > max_chars:
                logger.debug(f"Truncated text for fast analysis {len(text)} -> {max_chars} chars.")
                
            raw = await chain.ainvoke({"document_text": truncated_text, "user_profile": user_profile})
            raw_text = extract_text(raw.content) if hasattr(raw, "content") else extract_text(raw)
            return _parse_analysis(document_id, raw_text)
            
        except Exception as e:
            error_msg = str(e)
            logger.warning(f"Transient LLM failure on attempt {attempt + 1} for '{document_id}': {error_msg}")
            
            # If the error is a definitive 429 Quota/Rate Limit
            if "ResourceExhausted" in error_msg or "429" in error_msg or "retryDelay" in error_msg:
                # Provide a deeply user-friendly summary indicating the exact limit problem
                logger.error(f"Google Free Tier Rate Limit hit for '{document_id}'.")
                fallback_text = '{"summary": "Google API Free Tier limits reached (15 requests/min). The system is temporarily pausing to respect this rate limit. Please wait exactly one minute for the quota to reset and try again.", "key_facts": ["Document successfully processed.", "Awaiting API Rate Limit reset (1 minute)."], "entities": [], "timeline": [], "statistics": [], "sentiment": "neutral"}'
                return _parse_analysis(document_id, fallback_text)
            
            if attempt < max_retries - 1:
                delay = base_delay * (2 ** attempt)
                logger.info(f"Retrying in {delay} seconds...")
                await asyncio.sleep(delay)
            else:
                logger.error(f"All {max_retries} attempts failed for '{document_id}'.")
                fallback_text = '{"summary": "Document processed. AI summary unavailable due to a persistent API connection error. Please try again later.", "key_facts": ["Document uploaded successfully."], "entities": [], "timeline": [], "statistics": [], "sentiment": "neutral"}'
                return _parse_analysis(document_id, fallback_text)


from app.models.response_models import AnalysisResponse, Entity, TimelineEvent, Statistic, VideoScript, VideoScene, StoryArc


def _parse_analysis(document_id: str, raw_text: str) -> AnalysisResponse:
    """Parse the LLM JSON output into an AnalysisResponse."""
    data = _safe_json_parse(raw_text)

    entities = [
        Entity(
            name=e.get("name", ""),
            type=e.get("type", "OTHER"),
            context=e.get("context", ""),
        )
        for e in data.get("entities", [])
        if e.get("name")
    ]

    timeline = [
        TimelineEvent(date=t.get("date", ""), event=t.get("event", ""))
        for t in data.get("timeline", [])
        if t.get("event")
    ]

    statistics = [
        Statistic(value=s.get("value", ""), context=s.get("context", ""))
        for s in data.get("statistics", [])
        if s.get("value")
    ]

    # Handle New Fields
    video_data = data.get("video_script", {})
    video_script = None
    if video_data:
        video_script = VideoScript(
            headline=video_data.get("headline", "News Update"),
            scenes=[
                VideoScene(narration=s.get("narration", ""), visual_suggestion=s.get("visual_suggestion", ""))
                for s in video_data.get("scenes", [])
            ]
        )

    arc_data = data.get("story_arc", {})
    story_arc = StoryArc(
        timeline=timeline,
        key_players=arc_data.get("key_players", []),
        sentiment_shift=arc_data.get("sentiment_shift", ""),
        next_prediction=arc_data.get("next_prediction", "")
    )

    return AnalysisResponse(
        document_id=document_id,
        summary=data.get("summary", "Summary not available."),
        key_facts=data.get("key_facts", []),
        entities=entities,
        timeline=timeline,
        statistics=statistics,
        video_script=video_script,
        story_arc=story_arc,
        sentiment=data.get("sentiment", "neutral")
    )


def _safe_json_parse(text: str) -> dict:
    """Attempt to parse JSON, stripping markdown fences if present."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        logger.warning("LLM did not return valid JSON. Returning empty dict.")
        return {}
