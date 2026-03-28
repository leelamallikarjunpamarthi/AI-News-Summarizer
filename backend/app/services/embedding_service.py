"""
embedding_service.py
────────────────────
Abstraction layer for generating text embeddings.
Supports:
  - Sentence Transformers (local, no API cost)
  - OpenAI Embeddings (via LangChain)
The provider is chosen by EMBEDDING_PROVIDER in .env.
"""

from __future__ import annotations
from abc import ABC, abstractmethod
from functools import lru_cache
import time
from loguru import logger

from app.config import settings


# ── Base interface ─────────────────────────────────────────────────────────────

class BaseEmbedder(ABC):
    @abstractmethod
    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Embed a list of texts and return a list of embedding vectors."""

    @abstractmethod
    def embed_query(self, text: str) -> list[float]:
        """Embed a single query string."""


# ── Sentence Transformers ──────────────────────────────────────────────────────

class SentenceTransformerEmbedder(BaseEmbedder):
    """Local embedding using sentence-transformers (no API key required)."""

    def __init__(self, model_name: str):
        from sentence_transformers import SentenceTransformer
        import torch
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Loading SentenceTransformer model: {model_name} on {device}")
        self._model = SentenceTransformer(model_name, device=device)
        logger.info("SentenceTransformer model loaded ✓")

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        start = time.perf_counter()
        vectors = self._model.encode(texts, show_progress_bar=False, convert_to_numpy=True)
        duration = time.perf_counter() - start
        logger.info(f"Generated {len(texts)} embeddings in {duration:.4f}s")
        return [v.tolist() for v in vectors]

    def embed_query(self, text: str) -> list[float]:
        vector = self._model.encode([text], show_progress_bar=False, convert_to_numpy=True)
        return vector[0].tolist()


# ── OpenAI Embeddings ──────────────────────────────────────────────────────────

class OpenAIEmbedder(BaseEmbedder):
    """Cloud embedding using OpenAI's text-embedding-ada-002 (or newer)."""

    def __init__(self, api_key: str, model: str = "text-embedding-3-small"):
        from langchain_openai import OpenAIEmbeddings
        logger.info(f"Initialising OpenAI embedder: {model}")
        self._embedder = OpenAIEmbeddings(openai_api_key=api_key, model=model)

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        return self._embedder.embed_documents(texts)

    def embed_query(self, text: str) -> list[float]:
        return self._embedder.embed_query(text)


# ── Factory ────────────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def get_embedder() -> BaseEmbedder:
    """
    Return the configured embedder singleton.
    Cached so the model is loaded only once per process.
    """
    provider = settings.embedding_provider.lower()

    if provider == "openai":
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is required when EMBEDDING_PROVIDER=openai")
        return OpenAIEmbedder(api_key=settings.openai_api_key)

    # Default: sentence-transformers
    return SentenceTransformerEmbedder(model_name=settings.sentence_transformer_model)


def embed_chunks(chunks: list[str]) -> list[list[float]]:
    """Convenience wrapper: embed a list of text chunks."""
    return get_embedder().embed_texts(chunks)


def embed_query(text: str) -> list[float]:
    """Convenience wrapper: embed a single query."""
    return get_embedder().embed_query(text)
