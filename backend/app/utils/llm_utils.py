"""
llm_utils.py
────────────
Shared utilities for processing LLM responses.
"""

def extract_text(content: str | list | dict) -> str:
    """
    Safely extract the text content from a LangChain Message's content property.
    Gemini sometimes returns content as a list of dictionaries.
    """
    if isinstance(content, str):
        return content
    
    if isinstance(content, list):
        texts = []
        for part in content:
            if isinstance(part, str):
                texts.append(part)
            elif isinstance(part, dict) and 'text' in part:
                texts.append(part['text'])
        return "".join(texts)
    
    return str(content)
