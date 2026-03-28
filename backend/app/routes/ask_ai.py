"""
ask_ai.py
─────────
POST /api/v1/ask           → full JSON response (backward-compatible)
GET  /api/v1/ask/stream    → Server-Sent Events stream (sub-3s visible response)
"""

import json
from fastapi import APIRouter, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from loguru import logger

from app.models.request_models import AskRequest
from app.models.response_models import AskResponse, ErrorResponse
from app.vectorstore.chroma_db import document_exists
from app.services.rag_service import run_rag_query, stream_rag_response
from app.config import settings

router = APIRouter()


# ── Streaming endpoint (primary – fastest) ────────────────────────────────────

@router.get(
    "/ask/stream",
    summary="Stream an AI answer via Server-Sent Events",
    description=(
        "Runs the RAG pipeline and streams answer tokens as SSE events. "
        "The first token typically arrives in under 1 second."
    ),
)
async def ask_stream(
    document_id: str = Query(..., description="Document ID to query"),
    question: str = Query(..., description="Question to ask"),
):
    if not question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    logger.info("SSE stream for doc '{}': {:.80}", document_id, question)

    async def event_generator():
        try:
            full_answer = []
            async for chunk in stream_rag_response(document_id=document_id, question=question):
                full_answer.append(chunk)
                # SSE format: "data: <json>\n\n"
                payload = json.dumps({"token": chunk})
                yield f"data: {payload}\n\n"

            # Send a final "done" event with the complete answer
            complete = "".join(full_answer)
            yield f"data: {json.dumps({'done': True, 'answer': complete})}\n\n"

        except Exception as exc:
            logger.error("SSE stream error for '{}': {}", document_id, exc)
            err_payload = json.dumps({"error": str(exc)[:200]})
            yield f"data: {err_payload}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disable nginx buffering
        },
    )


# ── Non-streaming endpoint (fallback / backward-compatible) ───────────────────

@router.post(
    "/ask",
    response_model=AskResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Document not found"},
        500: {"model": ErrorResponse, "description": "RAG query failed"},
    },
    summary="Ask a question about an uploaded document",
)
async def ask_document(request: AskRequest):
    document_id = request.document_id

    if not document_exists(document_id):
        logger.warning("Document '{}' not found. Using general knowledge.", document_id)

    logger.info("RAG question for doc '{}': {:.100}", document_id, request.question)

    try:
        response = await run_rag_query(document_id=document_id, question=request.question)
    except Exception as e:
        logger.error("RAG query failed for doc '{}': {}", document_id, e, exc_info=True)
        error_msg = str(e).lower()

        if "rate_limited" in error_msg or any(k in error_msg for k in ("429", "quota", "resource_exhausted")):
            detail = "The AI service is temporarily rate-limited. Please wait a few seconds and try again."
        elif any(k in error_msg for k in ("404", "not found")):
            detail = "The AI model endpoint was not found. Please check your GEMINI_MODEL in .env."
        elif any(k in error_msg for k in ("401", "api key", "invalid")):
            detail = "Invalid AI API key. Please check GOOGLE_API_KEY in your backend configuration."
        elif settings.debug:
            detail = f"RAG error: {str(e)}"
        else:
            detail = "An error occurred while processing your question. Please try again."

        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail)

    logger.info("✅ RAG answer for '{}': {} sources.", document_id, len(response.sources))
    return response
