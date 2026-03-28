"""
insight_prompt.py
─────────────────
Prompt template for the RAG-based question-answering endpoint.
Instructs the LLM to answer strictly from retrieved context and cite sources.
"""

from langchain_core.prompts import ChatPromptTemplate

RAG_SYSTEM = (
    "You are a concise research assistant. "
    "Answer the journalist's question using ONLY the provided context passages. "
    "If the answer is not in the context, say so briefly. "
    "Keep answers under 3 sentences. Output plain text only — no JSON, no preambles."
)

RAG_HUMAN = "Question: {question}\n\nContext:\n{context}\n\nAnswer directly and concisely:"

rag_prompt = ChatPromptTemplate.from_messages([
    ("system", RAG_SYSTEM),
    ("human", RAG_HUMAN),
])


# ── Standalone insight extraction prompt (for re-analysis) ────────────────────
INSIGHT_SYSTEM = """You are a senior investigative journalist and data analyst. \
Extract the most newsworthy insights from the provided document excerpt.

Output ONLY valid JSON.

JSON schema:
{{
  "headline_insight": "<Single most important finding>",
  "supporting_insights": ["<insight 1>", "<insight 2>", "..."],
  "story_angles": ["<potential news angle 1>", "<angle 2>"],
  "questions_raised": ["<question the document raises>"],
  "source_credibility_notes": "<notes on the nature/credibility of the source>"
}}
"""

INSIGHT_HUMAN = """Document excerpt:
─────────────────────────────────────────────────────
{document_text}
─────────────────────────────────────────────────────

Extract journalistic insights and return valid JSON."""

insight_prompt = ChatPromptTemplate.from_messages([
    ("system", INSIGHT_SYSTEM),
    ("human", INSIGHT_HUMAN),
])
