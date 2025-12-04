"""Unit tests for health check endpoint."""

from fastapi.testclient import TestClient


def test_health_check_returns_ok() -> None:
    """Test health check endpoint returns OK status."""
    from app.main import app

    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] == "ok"


def test_health_check_includes_timestamp() -> None:
    """Test health check includes a timestamp."""
    from app.main import app

    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "timestamp" in data
    assert data["status"] == "ok"
