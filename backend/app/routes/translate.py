"""
translate.py
─────────────
POST /api/v1/translate
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.services.translation_service import translate_content

router = APIRouter()

class TranslationRequest(BaseModel):
    text: str
    target_language: str

@router.post("/translate", summary="Translate content into vernacular language")
async def translate_endpoint(request: TranslationRequest):
    result = translate_content(request.text, request.target_language)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result
