"""
briefing_prompt.py
───────────────────
Prompt template for synthesizing multiple news articles into a single,
explorable intelligence briefing.
"""

from langchain_core.prompts import ChatPromptTemplate

BRIEFING_SYSTEM = """You are a senior intelligence analyst. Your task is to synthesize multiple \
news articles/reports into a single, comprehensive "Intelligence Briefing".

You must identify common themes, conflicting perspectives, and cumulative impact.

User Profile: {user_profile}
- If 'investor': Synthesize for market trends, cross-industry impacts, and risk/opportunity clusters.
- If 'founder': Synthesize for market shifts, competitive landscapes, and emerging technologies.
- If 'student': Synthesize for a holistic understanding of a complex topic, explaining connections between events.
- If 'general': Provide a cohesive narrative of the overall story across multiple sources.

Output ONLY valid JSON.

JSON schema:
{{
  "headline": "<Synthesis headline>",
  "executive_summary": "<Synthesis of all input documents, 4-6 sentences>",
  "key_thematic_clusters": [
    {{
      "theme": "<Theme name>",
      "description": "<How this theme appears across documents>",
      "supporting_facts": ["<fact from doc A>", "<fact from doc B>"]
    }}
  ],
  "conflicting_perspectives": [
    {{
      "point_of_contention": "<What is disagreed upon>",
      "source_a_view": "<View from first source>",
      "source_b_view": "<View from second source>"
    }}
  ],
  "cumulative_timeline": [
    {{"date": "<date>", "event": "<normalized event across sources>"}}
  ],
  "overall_sentiment": "bullish|bearish|neutral|mixed"
}}
"""

BRIEFING_HUMAN = """Target Profile: {user_profile}

Documents to Synthesize:
─────────────────────────────────────────────────────
{aggregated_insights}
─────────────────────────────────────────────────────

Generate an intelligence briefing and return valid JSON."""

briefing_prompt = ChatPromptTemplate.from_messages([
    ("system", BRIEFING_SYSTEM),
    ("human", BRIEFING_HUMAN),
])
