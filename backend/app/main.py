"""Main application module for Teller Quoting System."""

from datetime import UTC, datetime

from fastapi import FastAPI

app = FastAPI(
    title="Teller Quoting System",
    description="API for generating professional services quotes",
    version="0.1.0",
)


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
