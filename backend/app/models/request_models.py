"""
request_models.py
─────────────────
Pydantic models for all API request payloads.
"""

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    document_id: str = Field(
        ...,
        description="ID returned when the document was uploaded.",
        examples=["doc_abc123"],
    )
    user_profile: str = Field(
        default="general",
        description="Target audience profile: investor | founder | student | general",
        examples=["investor"],
    )


class ArticleRequest(BaseModel):
    document_id: str = Field(
        ...,
        description="ID of the document to generate an article from.",
        examples=["doc_abc123"],
    )
    user_profile: str = Field(
        default="general",
        description="Target audience profile: investor | founder | student | general",
        examples=["investor"],
    )
    tone: str = Field(
        default="neutral",
        description="Journalistic tone: neutral | investigative | feature | breaking-news",
        examples=["neutral"],
    )
    focus: str = Field(
        default="",
        description="Optional focus area or angle for the article.",
        examples=["climate policy implications"],
    )


class AskRequest(BaseModel):
    document_id: str = Field(
        ...,
        description="ID of the document to query.",
        examples=["doc_abc123"],
    )
    question: str = Field(
        ...,
        min_length=5,
        description="Natural-language question about the document.",
        examples=["What are the main recommendations of the report?"],
    )
