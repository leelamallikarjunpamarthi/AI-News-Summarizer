"""
rag_service.py — updated model: gemini-2.5-flash-lite
──────────────
Ultra-fast RAG pipeline using google-genai SDK directly (no LangChain overhead).

Two modes:
  - stream_rag_response()  → async generator of text chunks (SSE, first token <1s)
  - run_rag_query()        → full AskResponse JSON (backward-compatible POST)
"""

from __future__ import annotations
import asyncio
from functools import lru_cache
from loguru import logger

from app.config import settings
from app.services.embedding_service import embed_query
from app.vectorstore.chroma_db import query_collection
from app.models.response_models import AskResponse, SourceCitation

# ── Minimal prompt (fewer tokens = faster) ────────────────────────────────────
_SYSTEM = (
    "You are a concise AI assistant. Answer the question using the context. "
    "Be direct, 2-3 sentences max. Plain text only."
)


# ── Gemini client singleton ────────────────────────────────────────────────────
@lru_cache(maxsize=1)
def _get_client():
    """Cached google-genai Client instance."""
    from google import genai
    client = genai.Client(api_key=settings.google_api_key)
    model_name = settings.gemini_model or "gemini-2.5-flash-lite"
    logger.info("google-genai client ready (model={})", model_name)
    return client, model_name


# ── Retrieval helper ──────────────────────────────────────────────────────────
def _retrieve(question: str, document_id: str) -> tuple[str, list[dict], list[float]]:
    """Embed question + retrieve top-1 most-relevant chunk."""
    query_vector = embed_query(question)
    results = query_collection(
        query_embedding=query_vector,
        document_id=document_id,
        n_results=1,   # 1 chunk = fastest possible
    )
    docs: list[str] = results.get("documents", [[]])[0]
    metas: list[dict] = results.get("metadatas", [[]])[0]
    dists: list[float] = results.get("distances", [[]])[0]
    context = docs[0][:600] if docs else "No document context available."
    return context, metas, dists


def _build_prompt(question: str, context: str) -> str:
    return f"{_SYSTEM}\n\nContext:\n{context}\n\nQuestion: {question}\n\nAnswer:"


# ── Streaming entrypoint ───────────────────────────────────────────────────────
async def stream_rag_response(document_id: str, question: str):
    """
    Async generator - yields text chunks as Gemini streams them.
    First token arrives in < 1 second.
    """
    logger.info("Streaming RAG '{}': {:.60} …", document_id, question)

    # Retrieval in thread (non-blocking)
    context, metas, dists = await asyncio.get_event_loop().run_in_executor(
        None, _retrieve, question, document_id
    )

    prompt = _build_prompt(question, context)
    client, model_name = _get_client()

    try:
        from google.genai import types
        config = types.GenerateContentConfig(
            max_output_tokens=256,
            temperature=0.1,
        )
        # Use async streaming
        async for chunk in await client.aio.models.generate_content_stream(
            model=model_name,
            contents=prompt,
            config=config,
        ):
            if chunk.text:
                yield chunk.text

    except Exception as exc:
        msg = str(exc).lower()
        if any(k in msg for k in ("429", "quota", "resource_exhausted", "rate")):
            yield "\n\n⚠️ Rate limited — please wait a moment and try again."
        else:
            logger.error("Gemini streaming error: {}", exc)
            yield f"\n\n⚠️ Error: {str(exc)[:120]}"


# ── Non-streaming fallback ────────────────────────────────────────────────────
async def run_rag_query(document_id: str, question: str) -> AskResponse:
    """Full RAG pipeline — returns complete AskResponse. Uses native Gemini async."""
    logger.info("RAG query '{}': {:.80} …", document_id, question)

    context, metas, dists = await asyncio.get_event_loop().run_in_executor(
        None, _retrieve, question, document_id
    )

    prompt = _build_prompt(question, context)
    client, model_name = _get_client()

    try:
        from google.genai import types
        config = types.GenerateContentConfig(
            max_output_tokens=256,
            temperature=0.1,
        )
        response = await client.aio.models.generate_content(
            model=model_name,
            contents=prompt,
            config=config,
        )
        answer_text = response.text.strip() if response.text else "No answer generated."
    except Exception as exc:
        msg = str(exc).lower()
        if any(k in msg for k in ("429", "quota", "resource_exhausted")):
            raise RuntimeError("rate_limited") from exc
        raise

    sources = []
    if metas and dists:
        meta, dist = metas[0], dists[0]
        sources.append(SourceCitation(
            chunk_index=meta.get("chunk_index", 0),
            page=meta.get("page"),
            text=context[:400],
            relevance_score=round(1 - dist, 4) if dist is not None else None,
        ))

    logger.info("✅ RAG done for '{}' ({} sources)", document_id, len(sources))
    return AskResponse(
        question=question,
        answer=answer_text,
        sources=sources,
        document_id=document_id,
    )
