"""
main.py
───────
FastAPI application entry point.
Registers all routes, configures CORS, logging, and startup events.
"""

# Reload triggered for new API key verification
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
import sys
import time

from app.config import settings
from app.routes import upload, analyze, article, ask_ai
from app.vectorstore.chroma_db import get_chroma_client

# ── Logging setup ────────────────────────────────────────────────────────────
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level}</level> | {message}",
    level="DEBUG" if settings.debug else "INFO",
    colorize=True,
)
logger.add(
    "logs/app.log",
    rotation="10 MB",
    retention="7 days",
    level="INFO",
    enqueue=True,
)

# ── FastAPI app ──────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "GenAI-powered platform for journalists to upload documents, "
        "extract insights, generate articles, and query via RAG."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS middleware ───────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request timing middleware ─────────────────────────────────────────────────
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration = time.perf_counter() - start
    response.headers["X-Process-Time"] = f"{duration:.4f}s"
    logger.debug(f"{request.method} {request.url.path} → {response.status_code} [{duration:.3f}s]")
    return response


from fastapi.exceptions import RequestValidationError
from fastapi import HTTPException as FastAPIHTTPException

import traceback

# ── Global exception handler ──────────────────────────────────────────────────
@app.exception_handler(FastAPIHTTPException)
async def http_exception_handler(request: Request, exc: FastAPIHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    logger.error("Unhandled exception on {}: {}\n{}", request.url.path, exc, tb)
    
    # If it's a FastAPI HTTPException, let the specific handler above take it
    if isinstance(exc, FastAPIHTTPException):
        return await http_exception_handler(request, exc)

    headers = {}
    origin = request.headers.get("origin")
    if origin in settings.cors_origins or "*" in settings.cors_origins:
        headers["Access-Control-Allow-Origin"] = origin if origin else "*"
        headers["Access-Control-Allow-Credentials"] = "true"
    
    detail = "An internal server error occurred. Please check your API keys or try again."
    if settings.debug:
        detail = f"Internal Error: {str(exc)}"
        
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": detail},
        headers=headers,
    )


# ── Startup / shutdown events ─────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup():
    logger.info(f"🚀 {settings.app_name} v{settings.app_version} starting …")
    # Ensure ChromaDB collection is initialised
    get_chroma_client()
    logger.info("✅ ChromaDB initialised")


@app.on_event("shutdown")
async def on_shutdown():
    logger.info("Shutting down gracefully …")


# ── Routes ────────────────────────────────────────────────────────────────────
from app.routes import upload, analyze, article, ask_ai, briefing, translate

app.include_router(upload.router, prefix="/api/v1", tags=["Upload"])
app.include_router(analyze.router, prefix="/api/v1", tags=["Analyze"])
app.include_router(article.router, prefix="/api/v1", tags=["Article"])
app.include_router(ask_ai.router, prefix="/api/v1", tags=["Ask AI"])
app.include_router(briefing.router, prefix="/api/v1", tags=["Briefing"])
app.include_router(translate.router, prefix="/api/v1", tags=["Translate"])


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def root():
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "healthy",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "version": settings.app_version}
