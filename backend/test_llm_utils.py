from app.utils.llm_utils import extract_text

# Test case 1: String content
print(f"Test 1 (String): {extract_text('Hello World') == 'Hello World'}")

# Test case 2: List of dicts (Gemini style)
gemini_content = [{'type': 'text', 'text': '{"answer": "Success"}'}]
print(f"Test 2 (Gemini List): {extract_text(gemini_content) == '{\"answer\": \"Success\"}'}")

# Test case 3: Mixed list
mixed_content = ['Part 1', {'type': 'text', 'text': 'Part 2'}]
print(f"Test 3 (Mixed List): {extract_text(mixed_content) == 'Part 1Part 2'}")

# Test case 4: Fallback
print(f"Test 4 (Fallback): {extract_text(123) == '123'}")
