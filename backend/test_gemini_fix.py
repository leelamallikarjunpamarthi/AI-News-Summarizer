import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")
model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

print(f"Testing model: {model_name}")

try:
    llm = ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=api_key,
        temperature=0.3,
    )
    
    response = llm.invoke([HumanMessage(content="Hello, what model are you?")])
    print(f"Response: {response.content}")
    print("SUCCESS: Model is working!")
except Exception as e:
    print(f"FAILURE: {e}")
