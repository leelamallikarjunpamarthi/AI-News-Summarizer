"""
briefing.py
────────────
POST /api/v1/briefing
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from app.services.briefing_service import generate_briefing

router = APIRouter()

class BriefingRequest(BaseModel):
    document_ids: list[str] = Field(..., min_items=1)
    user_profile: str = Field(default="general")

@router.post("/briefing", summary="Generate an interactive intelligence briefing")
async def briefing_endpoint(request: BriefingRequest):
    result = await generate_briefing(request.document_ids, request.user_profile)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result
