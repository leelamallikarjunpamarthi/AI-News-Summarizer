"""
chroma_db.py
────────────
ChromaDB vector store client.
Provides functions to initialise the collection, add documents,
and perform similarity search with metadata.
"""

import chromadb
from chromadb.config import Settings as ChromaSettings
from loguru import logger
from app.config import settings


# Module-level singleton
_chroma_client: chromadb.ClientAPI | None = None
_collection: chromadb.Collection | None = None


def get_chroma_client() -> chromadb.ClientAPI:
    """
    Return (and cache) a persistent ChromaDB client.
    Creates the persist directory if it doesn't exist.
    """
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(
            path=settings.chroma_persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        logger.info(f"ChromaDB client created. Persist path: {settings.chroma_persist_dir}")
    return _chroma_client


def get_collection() -> chromadb.Collection:
    """
    Return (and cache) the main ChromaDB collection.
    Creates the collection if it doesn't exist.
    """
    global _collection
    if _collection is None:
        client = get_chroma_client()
        _collection = client.get_or_create_collection(
            name=settings.chroma_collection_name,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info(f"ChromaDB collection ready: '{settings.chroma_collection_name}'")
    return _collection


def add_chunks(
    document_id: str,
    chunks: list[str],
    embeddings: list[list[float]],
    metadatas: list[dict],
) -> None:
    """
    Add document chunks with their embeddings to ChromaDB.

    Args:
        document_id: Unique document identifier (used as ID prefix).
        chunks: List of text chunks.
        embeddings: Pre-computed embedding vectors (one per chunk).
        metadatas: List of metadata dicts (one per chunk).
    """
    collection = get_collection()
    ids = [f"{document_id}_chunk_{i}" for i in range(len(chunks))]

    collection.add(
        ids=ids,
        documents=chunks,
        embeddings=embeddings,
        metadatas=metadatas,
    )
    logger.info(f"Added {len(chunks)} chunks for document '{document_id}'")


def query_collection(
    query_embedding: list[float],
    document_id: str | None = None,
    n_results: int = 5,
) -> dict:
    """
    Retrieve the top-N most similar chunks.

    Args:
        query_embedding: Embedding vector for the query.
        document_id: If provided, filter results to this document only.
        n_results: Number of results to return.

    Returns:
        ChromaDB query result dict with keys: ids, documents, metadatas, distances.
    """
    collection = get_collection()

    where_filter = {"document_id": document_id} if document_id else None

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        where=where_filter,
        include=["documents", "metadatas", "distances"],
    )
    return results


def document_exists(document_id: str) -> bool:
    """Check whether any chunks for a given document_id are stored."""
    collection = get_collection()
    results = collection.get(
        where={"document_id": document_id},
        limit=1,
        include=[],
    )
    return len(results["ids"]) > 0


def delete_document(document_id: str) -> int:
    """
    Delete all chunks belonging to a document.

    Returns:
        Number of chunks deleted.
    """
    collection = get_collection()
    results = collection.get(where={"document_id": document_id}, include=[])
    ids = results["ids"]
    if ids:
        collection.delete(ids=ids)
        logger.info(f"Deleted {len(ids)} chunks for document '{document_id}'")
    return len(ids)

def list_documents() -> list[dict]:
    """
    List all unique documents stored in ChromaDB.
    Returns:
        List of dicts with 'document_id' and 'filename'.
    """
    collection = get_collection()
    # Fetch all metadatas. This can be optimized if there are many documents.
    # For this app, we assume a reasonable number of chunks.
    results = collection.get(include=["metadatas"])
    metadatas = results.get("metadatas", [])
    
    unique_docs = {}
    for meta in metadatas:
        doc_id = meta.get("document_id")
        if doc_id and doc_id not in unique_docs:
            unique_docs[doc_id] = {
                "document_id": doc_id,
                "filename": meta.get("filename", "Unknown")
            }
            
    return list(unique_docs.values())
