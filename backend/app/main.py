"""Main application module for Teller Quoting System."""

from datetime import UTC, datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import pricing, referrer, saas, sku, text_snippet, travel

app = FastAPI(
    title="Teller Quoting System",
    description="API for generating professional services quotes",
    version="0.1.0",
)

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Vite ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(pricing.router, prefix="/api")
app.include_router(saas.router, prefix="/api")
app.include_router(sku.router, prefix="/api")
app.include_router(travel.router, prefix="/api")
app.include_router(referrer.router, prefix="/api")
app.include_router(text_snippet.router, prefix="/api")


@app.get("/health")
def health_check() -> dict[str, str]:
    """
    Health check endpoint.

    Returns:
        dict with status and timestamp
    """
    return {
        "status": "ok",
        "timestamp": datetime.now(UTC).isoformat(),
    }
