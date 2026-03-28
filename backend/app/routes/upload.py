"""
upload.py
─────────
POST /api/v1/upload

Handles PDF upload:
1. Validates file type
2. Extracts text via pdf_service
3. Splits text into chunks
4. Generates embeddings
5. Stores chunks + embeddings in ChromaDB
6. Returns document_id, text_length, chunk_count
"""

import uuid
from fastapi import APIRouter, File, UploadFile, HTTPException, status, BackgroundTasks, Response
from loguru import logger

from app.models.response_models import UploadResponse, ErrorResponse
from app.services.document_service import extract_text, build_chunk_metadata, OCRBackgroundRequired
from app.services.embedding_service import embed_chunks
from app.utils.text_splitter import split_text
from app.vectorstore.chroma_db import add_chunks, list_documents, delete_document
from app.services.analysis_store import delete_analysis

router = APIRouter()

ALLOWED_CONTENT_TYPES = {
    "application/pdf", 
    "application/x-pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain"
}
MAX_FILE_SIZE_MB = 50


@router.post(
    "/upload",
    response_model=UploadResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid file type or content"},
        413: {"model": ErrorResponse, "description": "File too large"},
        500: {"model": ErrorResponse, "description": "Internal processing error"},
    },
    summary="Upload a PDF document for analysis",
    description=(
        "Upload a PDF file. The backend will extract text, split it into chunks, "
        "generate embeddings, and store everything in the vector database. "
        "Returns a document_id to use in subsequent API calls."
    ),
)
async def upload_document(
    background_tasks: BackgroundTasks,
    response: Response,
    file: UploadFile = File(..., description="PDF document to upload")
):
    # ── Validate file type ───────────────────────────────────────────────────
    if file.content_type not in ALLOWED_CONTENT_TYPES and not (
        file.filename and (
            file.filename.lower().endswith(".pdf") or 
            file.filename.lower().endswith(".docx") or 
            file.filename.lower().endswith(".doc") or 
            file.filename.lower().endswith(".txt")
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF, DOCX, DOC, and TXT files are accepted.",
        )

    # ── Read file bytes ──────────────────────────────────────────────────────
    file_bytes = await file.read()

    # ── Validate file size ────────────────────────────────────────────────────
    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size ({size_mb:.1f} MB) exceeds the {MAX_FILE_SIZE_MB} MB limit.",
        )

    # ── Generate document ID ──────────────────────────────────────────────────
    document_id = f"doc_{uuid.uuid4().hex[:12]}"
    filename = file.filename or "uploaded_document.pdf"
    logger.info(f"Processing upload: '{filename}' → document_id='{document_id}' ({size_mb:.2f} MB)")

    # ── Send Document for Background Processing ───────────────────────────────
    logger.info(f"Triggering background processing for '{filename}'")
    background_tasks.add_task(
        _process_document_background,
        document_id=document_id,
        file_bytes=file_bytes,
        filename=filename,
        content_type=file.content_type
    )

    # Return 202 Accepted immediately so the frontend upload completes instantly (< 5s)
    response.status_code = status.HTTP_202_ACCEPTED
    
    return UploadResponse(
        document_id=document_id,
        filename=filename,
        text_length=0,
        chunk_count=0,
        message="Document uploaded successfully. Processing in the background. It will appear in your analysis shortly."
    )


@router.get(
    "/documents",
    summary="List all uploaded documents",
    description="Returns a list of all documents currently indexed in the vector database.",
)
async def get_all_documents():
    try:
        documents = list_documents()
        return {"documents": documents}
    except Exception as e:
        logger.error(f"Failed to list documents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve documents: {str(e)}",
        )


@router.delete(
    "/documents/{document_id}",
    summary="Delete a document",
    description="Deletes all chunks associated with the given document ID from the vector database.",
)
async def remove_document(document_id: str):
    try:
        count = delete_document(document_id)
        if count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document '{document_id}' not found or already deleted.",
            )
        # Also clean up analysis cache
        delete_analysis(document_id)
        return {"message": f"Successfully deleted document '{document_id}'", "chunks_deleted": count}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete document '{document_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document: {str(e)}",
        )
async def _process_document_background(
    document_id: str, 
    file_bytes: bytes, 
    filename: str, 
    content_type: str
):
    """Refactored logic to process extraction + embedding + storage in background."""
    try:
        logger.info(f"Background processing started for '{document_id}' ({filename})")
        # Ensure we use standard extraction without forcing it to OCR unless necessary
        # by falling back to the default thresholds configured in document_service.
        extracted = extract_text(file_bytes, filename, content_type)
        
        if not extracted.full_text.strip():
            logger.error(f"Background extraction for '{document_id}' produced no text.")
            return

        chunks = split_text(extracted.full_text)
        if not chunks:
            logger.error(f"Background extraction for '{document_id}' produced no chunks.")
            return

        embeddings = embed_chunks(chunks)
        metadatas = [
            build_chunk_metadata(
                document_id=document_id,
                filename=filename,
                pages=extracted.pages,
                chunk_index=i,
                chunk_text=chunk,
            )
            for i, chunk in enumerate(chunks)
        ]

        add_chunks(
            document_id=document_id,
            chunks=chunks,
            embeddings=embeddings,
            metadatas=metadatas,
        )
        logger.info(f"✅ Background processing complete for '{document_id}'")
        
    except Exception as e:
        logger.error(f"❌ Background processing failed for '{document_id}': {e}")
