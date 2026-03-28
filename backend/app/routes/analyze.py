"""
analyze.py
──────────
POST /api/v1/analyze

Retrieves stored document content and runs the insight-extraction pipeline.
Returns structured JSON with: summary, key_facts, entities, timeline, statistics.
"""

from fastapi import APIRouter, HTTPException, status
from loguru import logger

from app.models.request_models import AnalyzeRequest
from app.models.response_models import AnalysisResponse, ErrorResponse
from app.services.analysis_store import load_analysis, ANALYSIS_DIR
from app.services.insight_service import analyse_document
from app.vectorstore.chroma_db import get_collection, document_exists, list_documents

router = APIRouter()


@router.get(
    "/insights",
    summary="Get recent analysis insights",
    description="Returns a list of analysis results for all documents stored in the cache."
)
async def get_recent_insights():
    try:
        # Get list of documents from Chroma
        docs = list_documents()
        insights = []
        
        for doc in docs:
            doc_id = doc["document_id"]
            analysis = load_analysis(doc_id)
            if analysis:
                insights.append({
                    "id": doc_id,
                    "title": doc["filename"],
                    "summary": analysis.get("summary", ""),
                    "entities": [e["name"] for e in analysis.get("entities", [])[:3]],
                    "date": "Recently"
                })
        
        return {"insights": insights}
    except Exception as e:
        logger.error(f"Failed to fetch insights: {e}")
        return {"insights": []}


@router.post(
    "/analyze",
    response_model=AnalysisResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Document not found"},
        500: {"model": ErrorResponse, "description": "Analysis failed"},
    },
    summary="Analyse a previously uploaded document",
    description=(
        "Retrieves all stored chunks for a document and runs the AI analysis pipeline. "
        "Returns a summary, key facts, named entities, timeline events, and statistics."
    ),
)
async def analyze_document(request: AnalyzeRequest):
    document_id = request.document_id

    # ── Verify document exists ────────────────────────────────────────────────
    if not document_exists(document_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found. Please upload the document first.",
        )

    # ── Reconstruct full text from stored chunks ──────────────────────────────
    collection = get_collection()
    results = collection.get(
        where={"document_id": document_id},
        include=["documents", "metadatas"],
    )

    raw_chunks: list[str] = results.get("documents", [])
    raw_metas: list[dict] = results.get("metadatas", [])

    if not raw_chunks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No content found for document '{document_id}'.",
        )

    # Sort chunks by their stored index for coherent reconstruction
    paired = sorted(
        zip(raw_metas, raw_chunks),
        key=lambda x: x[0].get("chunk_index", 0),
    )
    full_text = "\n\n".join(str(chunk) for _, chunk in paired)

    logger.info(f"Analysing document '{document_id}' ({len(full_text)} chars, {len(raw_chunks)} chunks) | profile={request.user_profile}")

    # ── Run analysis ──────────────────────────────────────────────────────────
    try:
        # Call the asynchronous analysis service
        analysis = await analyse_document(
            document_id=document_id, 
            full_text=full_text,
            user_profile=request.user_profile
        )
    except Exception as e:
        logger.error("Analysis failed for '{}': {}", document_id, e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document analysis failed: {str(e)}",
        )

    logger.info(f"✅ Analysis complete for '{document_id}'")
    return analysis
