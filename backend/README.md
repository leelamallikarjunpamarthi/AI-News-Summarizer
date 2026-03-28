# AI-Powered News Summarization and Briefing - Backend

A production-ready **FastAPI** backend for a GenAI journalism research platform.  
Upload documents → extract insights → generate articles → ask questions with cited answers.

---

## 🏗️ Architecture Overview

```
backend/
├── app/
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Environment settings (pydantic-settings)
│   ├── routes/
│   │   ├── upload.py        # POST /api/v1/upload
│   │   ├── analyze.py       # POST /api/v1/analyze
│   │   ├── article.py       # POST /api/v1/generate-article
│   │   └── ask_ai.py        # POST /api/v1/ask (RAG)
│   ├── services/
│   │   ├── pdf_service.py       # PDF parsing (pdfplumber + PyPDF)
│   │   ├── embedding_service.py # Embeddings (Sentence Transformers / OpenAI)
│   │   ├── llm_service.py       # LLM factory (OpenAI GPT / Google Gemini)
│   │   ├── rag_service.py       # Full RAG pipeline
│   │   ├── article_service.py   # Article generation
│   │   └── insight_service.py   # Document analysis + summarisation
│   ├── models/
│   │   ├── request_models.py
│   │   └── response_models.py
│   ├── vectorstore/
│   │   └── chroma_db.py     # ChromaDB client + CRUD operations
│   ├── utils/
│   │   └── text_splitter.py # Recursive chunk splitter
│   └── prompts/
│       ├── summary_prompt.py  # Analysis prompt
│       ├── article_prompt.py  # Article generation prompt
│       └── insight_prompt.py  # RAG + insight prompts
├── data/
│   └── chroma/              # ChromaDB persistence directory (auto-created)
├── logs/                    # Application logs (auto-created)
├── requirements.txt
├── .env.example
└── README.md
```

---

## ⚡ Quick Start

### 1. Clone and set up environment

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env and set your API keys
```

Key variables in `.env`:

| Variable | Description | Default |
|---|---|---|
| `LLM_PROVIDER` | `openai` or `gemini` | `openai` |
| `OPENAI_API_KEY` | Your OpenAI API key | — |
| `GOOGLE_API_KEY` | Your Google Gemini API key | — |
| `EMBEDDING_PROVIDER` | `sentence-transformers` or `openai` | `sentence-transformers` |
| `CHROMA_PERSIST_DIR` | ChromaDB storage path | `./data/chroma` |
| `CHUNK_SIZE` | Token chunk size | `1000` |
| `CHUNK_OVERLAP` | Chunk overlap | `200` |
| `TOP_K_RESULTS` | RAG retrieval count | `5` |

### 3. Run the server

```bash
uvicorn app.main:app --reload
```

API available at: **http://localhost:8000**  
Interactive docs: **http://localhost:8000/docs**

---

## 📡 API Reference

### POST `/api/v1/upload`
Upload a PDF document.

**Request:** `multipart/form-data` with `file` field (PDF only, ≤ 50 MB)

**Response:**
```json
{
  "document_id": "doc_abc123ef4567",
  "filename": "report.pdf",
  "text_length": 45230,
  "chunk_count": 48,
  "message": "Document uploaded and indexed successfully."
}
```

---

### POST `/api/v1/analyze`
Extract structured insights from an uploaded document.

**Request:**
```json
{ "document_id": "doc_abc123ef4567" }
```

**Response:**
```json
{
  "document_id": "doc_abc123ef4567",
  "summary": "The report outlines ...",
  "key_facts": ["Fact 1", "Fact 2"],
  "entities": [{"name": "John Smith", "type": "PERSON", "context": "..."}],
  "timeline": [{"date": "January 2024", "event": "Policy enacted"}],
  "statistics": [{"value": "34%", "context": "Increase in renewables"}]
}
```

---

### POST `/api/v1/generate-article`
Generate a news article from document insights.

**Request:**
```json
{
  "document_id": "doc_abc123ef4567",
  "tone": "neutral",
  "focus": "climate policy implications"
}
```

`tone` options: `neutral` | `investigative` | `feature` | `breaking-news`

**Response:**
```json
{
  "headline": "Government Report Reveals 34% Rise in Renewable Energy",
  "subheadline": "New policy framework to accelerate green transition by 2030",
  "article": "Full article body...",
  "sections": [{"title": "Key Findings", "content": "..."}],
  "word_count": 487
}
```

---

### POST `/api/v1/ask`
Ask a question about a document (RAG pipeline).

**Request:**
```json
{
  "document_id": "doc_abc123ef4567",
  "question": "What are the main policy recommendations?"
}
```

**Response:**
```json
{
  "question": "What are the main policy recommendations?",
  "answer": "The document recommends three policies: ...",
  "sources": [
    {"chunk_index": 12, "page": 4, "text": "...relevant excerpt...", "relevance_score": 0.92}
  ],
  "document_id": "doc_abc123ef4567"
}
```

---

## 🔧 Technology Stack

| Component | Technology |
|---|---|
| API Framework | FastAPI |
| LLM (OpenAI) | `gpt-4o-mini` (configurable) |
| LLM (Gemini) | `gemini-1.5-flash` (configurable) |
| Embeddings | Sentence Transformers `all-MiniLM-L6-v2` |
| Vector Store | ChromaDB (persistent) |
| PDF Parsing | pdfplumber + PyPDF fallback |
| Text Splitting | LangChain `RecursiveCharacterTextSplitter` |
| Logging | Loguru |
| Settings | pydantic-settings |

---

## 📋 Workflow

```
PDF Upload → Text Extraction → Chunking → Embedding → ChromaDB
                                                          ↓
              Question → Embed Query → Similarity Search → LLM → Answer + Citations
                                                          ↓
              Document ID → Reconstruct Text → LLM Analysis → Insights
                                                          ↓
              Insights → LLM → Structured Article (Headline + Sections)
```

---

## 🔒 Security

- CORS is configured via `ALLOWED_ORIGINS` (comma-separated list)
- File size limit: 50 MB
- File type validation enforced on upload
- API key management via `.env` (never committed to version control)
- Add `API_SECRET_KEY` for bearer-token protection (extend with `fastapi.security`)

---

## 🚀 Production Deployment

```bash
# Production server (multiple workers)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

For Docker deployment, a `Dockerfile` can be added using `python:3.11-slim` as the base image.
