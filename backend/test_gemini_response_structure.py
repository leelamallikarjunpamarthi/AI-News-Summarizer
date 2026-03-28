import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")
model_name = os.getenv("GEMINI_MODEL", "gemini-flash-latest")

print(f"Testing model: {model_name}")

try:
    llm = ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=api_key,
        temperature=0.3,
    )
    
    response = llm.invoke([HumanMessage(content="Return a JSON object with a key 'test' and value 'success'.")])
    print(f"Raw Response Type: {type(response.content)}")
    print(f"Raw Response Content: {repr(response.content)}")
    
    # Simulate current buggy behavior
    buggy_text = str(response.content)
    print(f"Buggy Text: {buggy_text}")
    
except Exception as e:
    print(f"FAILURE: {e}")
