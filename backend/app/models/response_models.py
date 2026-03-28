"""
response_models.py
──────────────────
Pydantic models for all API response payloads.
"""

from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Any


# ── Upload ────────────────────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    document_id: str = Field(description="Unique identifier for the stored document.")
    filename: str = Field(description="Original filename of the uploaded PDF.")
    text_length: int = Field(description="Total number of characters extracted.")
    chunk_count: int = Field(description="Number of chunks stored in the vector database.")
    message: str = Field(default="Document uploaded and indexed successfully.")


# ── Analysis ──────────────────────────────────────────────────────────────────

class Entity(BaseModel):
    name: str
    type: str = Field(description="PERSON | ORGANIZATION | LOCATION | DATE | OTHER")
    context: str = Field(default="", description="Brief context sentence from the document.")


class TimelineEvent(BaseModel):
    date: str
    event: str


class Statistic(BaseModel):
    value: str
    context: str


class VideoScene(BaseModel):
    narration: str
    visual_suggestion: str


class VideoScript(BaseModel):
    headline: str
    scenes: list[VideoScene] = Field(default_factory=list)


class StoryArc(BaseModel):
    timeline: list[TimelineEvent] = Field(default_factory=list)
    key_players: list[str] = Field(default_factory=list)
    sentiment_shift: str = Field(default="", description="How sentiment evolves over the story.")
    next_prediction: str = Field(default="", description="AI prediction on what to watch next.")


class AnalysisResponse(BaseModel):
    document_id: str
    summary: str = Field(description="Concise executive summary of the document.")
    key_facts: list[str] = Field(default_factory=list)
    entities: list[Entity] = Field(default_factory=list)
    timeline: list[TimelineEvent] = Field(default_factory=list)
    statistics: list[Statistic] = Field(default_factory=list)
    video_script: VideoScript | None = None
    story_arc: StoryArc | None = None
    sentiment: str = Field(default="neutral", description="Overall sentiment: positive | negative | neutral")


# ── Article ───────────────────────────────────────────────────────────────────

class ArticleSection(BaseModel):
    title: str
    content: str


class ArticleResponse(BaseModel):
    document_id: str
    headline: str
    subheadline: str = Field(default="")
    article: str = Field(description="Full drafted article text.")
    sections: list[ArticleSection] = Field(default_factory=list)
    word_count: int = Field(default=0)


# ── Ask AI (RAG) ──────────────────────────────────────────────────────────────

class SourceCitation(BaseModel):
    chunk_index: int = Field(description="Position of the chunk in the stored collection.")
    page: int | None = Field(default=None, description="Page number if available in metadata.")
    text: str = Field(description="Relevant excerpt from the source document.")
    relevance_score: float | None = Field(default=None)


class AskResponse(BaseModel):
    question: str
    answer: str
    sources: list[SourceCitation] = Field(default_factory=list)
    document_id: str

# ── Generic error ─────────────────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    detail: str
    code: str = Field(default="INTERNAL_ERROR")
