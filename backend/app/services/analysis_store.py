"""
analysis_store.py
─────────────────
Simple file-based storage for document analysis results.
Prevents re-analysing documents that haven't changed.
"""

import json
import os
from pathlib import Path
from loguru import logger
from app.config import settings

# Ensure the analysis directory exists
ANALYSIS_DIR = Path(settings.chroma_persist_dir).parent / "analysis"
ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)

def save_analysis(document_id: str, analysis_data: dict) -> None:
    """Save an analysis result to a JSON file."""
    file_path = ANALYSIS_DIR / f"{document_id}.json"
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(analysis_data, f, indent=2, ensure_ascii=False)
        logger.info(f"Analysis for '{document_id}' saved to cache.")
    except Exception as e:
        logger.error(f"Failed to save analysis for '{document_id}': {e}")

def load_analysis(document_id: str) -> dict | None:
    """Load an analysis result from a JSON file if it exists."""
    file_path = ANALYSIS_DIR / f"{document_id}.json"
    if not file_path.exists():
        return None
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load analysis for '{document_id}': {e}")
        return None

def delete_analysis(document_id: str) -> bool:
    """Delete the analysis cache file for a document."""
    file_path = ANALYSIS_DIR / f"{document_id}.json"
    if file_path.exists():
        try:
            os.remove(file_path)
            logger.info(f"Analysis cache for '{document_id}' deleted.")
            return True
        except Exception as e:
            logger.error(f"Failed to delete analysis cache for '{document_id}': {e}")
            return False
    return False
