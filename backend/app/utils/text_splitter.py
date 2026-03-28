"""
text_splitter.py
────────────────
Wrapper around LangChain's RecursiveCharacterTextSplitter.
Splits extracted document text into overlapping chunks suitable for embedding.
"""

from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.config import settings


def get_text_splitter() -> RecursiveCharacterTextSplitter:
    """
    Return a configured RecursiveCharacterTextSplitter instance.
    Chunk size / overlap are driven by environment settings.
    """
    return RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", ". ", "! ", "? ", " ", ""],
    )


def split_text(text: str) -> list[str]:
    """
    Split a raw document string into a list of text chunks.

    Args:
        text: Full extracted document text.

    Returns:
        List of string chunks ready for embedding.
    """
    splitter = get_text_splitter()
    chunks = splitter.split_text(text)
    return [c.strip() for c in chunks if c.strip()]
