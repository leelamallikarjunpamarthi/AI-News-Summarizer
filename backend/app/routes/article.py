"""
article.py
──────────
POST /api/v1/generate-article

Generates a structured news article from document insights.
The caller must first run /analyze to obtain insights (or provide them directly).
"""

from fastapi import APIRouter, HTTPException, status
from loguru import logger

from app.models.request_models import ArticleRequest
from app.models.response_models import ArticleResponse, ErrorResponse
from app.vectorstore.chroma_db import document_exists, get_collection
from app.services.insight_service import analyse_document
from app.services.article_service import generate_article

router = APIRouter()


@router.post(
    "/generate-article",
    response_model=ArticleResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Document not found"},
        500: {"model": ErrorResponse, "description": "Article generation failed"},
    },
    summary="Generate a news article from document insights",
    description=(
        "Analyses the specified document and generates a structured news article "
        "in the requested journalistic tone. Returns headline, article body, and sections."
    ),
)
async def generate_article_endpoint(request: ArticleRequest):
    document_id = request.document_id

    # ── Verify document exists ─────────────────────────────────────────────────
    if not document_exists(document_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found. Please upload the document first.",
        )

    # ── Reconstruct full text from stored chunks ───────────────────────────────
    collection = get_collection()
    results = collection.get(
        where={"document_id": document_id},
        include=["documents", "metadatas"],
    )
    raw_chunks: list[str] = results.get("documents", [])
    raw_metas: list[dict] = results.get("metadatas", [])

    paired = sorted(
        zip(raw_metas, raw_chunks),
        key=lambda x: x[0].get("chunk_index", 0),
    )
    full_text = "\n\n".join(chunk for _, chunk in paired)

    # ── Run analysis to get structured insights ────────────────────────────────
    logger.info("Generating article for document '{}' | tone={}", document_id, request.tone)
    try:
        analysis = await analyse_document(document_id=document_id, full_text=full_text)
    except Exception as e:
        logger.error("Pre-analysis failed for article generation on '{}': {}", document_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document analysis step failed: {str(e)}",
        )

    # Convert analysis to dict for article generator
    insights = {
        "summary": analysis.summary,
        "key_facts": analysis.key_facts,
        "entities": [e.model_dump() for e in analysis.entities],
        "timeline": [t.model_dump() for t in analysis.timeline],
        "statistics": [s.model_dump() for s in analysis.statistics],
    }

    # ── Generate article ───────────────────────────────────────────────────────
    try:
        article = generate_article(
            document_id=document_id,
            insights=insights,
            user_profile=request.user_profile,
            tone=request.tone,
            focus=request.focus,
        )
    except Exception as e:
        logger.error("Article generation failed for '{}': {}", document_id, e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Article generation failed: {str(e)}",
        )

    logger.info(f"✅ Article generated for '{document_id}' ({article.word_count} words)")
    return article
