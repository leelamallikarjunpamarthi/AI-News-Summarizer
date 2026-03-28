import asyncio
from app.services.llm_service import get_llm
from langchain_core.prompts import PromptTemplate
from loguru import logger
import sys

# Configure logger to output to stdout
logger.remove()
logger.add(sys.stdout, level="DEBUG")

async def test_insight():
    llm = get_llm()
    print(f"Using LLM: {llm}")
    
    prompt = PromptTemplate.from_template("Summarize this: {document_text}")
    chain = prompt | llm
    
    text = "This is a short test document."
    user_profile = "Test user"
    
    try:
        print("Invoking chain...")
        raw = await chain.ainvoke({"document_text": text})
        print(f"Success! Content: {raw.content}")
    except Exception as e:
        print(f"FAILED WITH EXCEPTION: {type(e).__name__} - {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_insight())
