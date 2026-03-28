"""
config.py
─────────
Centralised settings loaded from .env via pydantic-settings.
All modules import `settings` from this file.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────
    app_name: str = Field(default="AI News Summarizer")
    app_version: str = Field(default="1.0.0")
    debug: bool = Field(default=False)

    # ── LLM ──────────────────────────────────────────
    google_api_key: str = Field(default="")
    gemini_model: str = Field(default="gemini-flash-latest")

    # ── Embeddings ───────────────────────────────────
    embedding_provider: str = Field(default="sentence-transformers")
    sentence_transformer_model: str = Field(default="all-MiniLM-L6-v2")

    # ── ChromaDB ─────────────────────────────────────
    chroma_persist_dir: str = Field(default="./data/chroma")
    chroma_collection_name: str = Field(default="news_documents")

    # ── CORS ─────────────────────────────────────────
    allowed_origins: str = Field(default="http://localhost:3000,http://localhost:5173")

    # ── API Security ─────────────────────────────────
    api_secret_key: str = Field(default="change-me-in-production")

    # ── Text Processing ───────────────────────────────
    chunk_size: int = Field(default=1000)
    chunk_overlap: int = Field(default=200)

    # ── RAG ──────────────────────────────────────────
    top_k_results: int = Field(default=5)

    @property
    def cors_origins(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance — avoids re-reading .env on every request."""
    return Settings()


# Convenience singleton used throughout the application
settings = get_settings()
