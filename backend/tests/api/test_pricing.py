"""Tests for pricing version API endpoints."""

from datetime import date, timedelta
from uuid import uuid4

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.core.deps import get_db
from app.main import app
from app.models import PricingVersion


@pytest.fixture(scope="module")
def engine():
    """Create a test database engine."""
    test_engine = create_engine(settings.database_url, echo=False)
    yield test_engine
    test_engine.dispose()


@pytest.fixture(scope="function")
def db_session(engine):
    """Create a fresh database session for each test."""
    connection = engine.connect()
    transaction = connection.begin()
    session = sessionmaker(bind=connection)()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def clean_db(db_session: Session):
    """Clean all pricing versions before each test."""
    db_session.query(PricingVersion).delete()
    db_session.commit()
    yield


@pytest.fixture
def client(db_session: Session, clean_db) -> TestClient:
    """Create a test client with overridden database dependency."""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_list_pricing_versions_empty(client: TestClient, db_session: Session) -> None:
    """Test listing pricing versions when database is empty."""
    response = client.get("/api/pricing-versions/")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == []


def test_list_pricing_versions(client: TestClient, db_session: Session) -> None:
    """Test listing pricing versions."""
    # Create a test version
    version = PricingVersion(
        VersionNumber="2025.1",
        Description="Test version",
        EffectiveDate=date.today(),
        CreatedBy="test@example.com",
        IsCurrent=False,
        IsLocked=False,
    )
    db_session.add(version)
    db_session.commit()

    response = client.get("/api/pricing-versions/")
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert len(data) == 1
    assert data[0]["VersionNumber"] == "2025.1"


def test_list_pricing_versions_pagination(client: TestClient, db_session: Session) -> None:
    """Test pagination of pricing versions list."""
    # Create multiple versions
    for i in range(5):
        version = PricingVersion(
            VersionNumber=f"2025.PAGE{i}",
            Description=f"Test version {i}",
            EffectiveDate=date.today(),
            CreatedBy="test@example.com",
            IsCurrent=False,
            IsLocked=False,
        )
        db_session.add(version)
    db_session.commit()

    # Test pagination
    response = client.get("/api/pricing-versions/?skip=0&limit=2")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 2


def test_create_pricing_version(client: TestClient, db_session: Session) -> None:
    """Test creating a new pricing version."""
    version_data = {
        "VersionNumber": "2025.2",
        "Description": "New test version",
        "EffectiveDate": date.today().isoformat(),
        "ExpirationDate": (date.today() + timedelta(days=365)).isoformat(),
        "CreatedBy": "test@example.com",
        "IsCurrent": False,
        "IsLocked": False,
    }

    response = client.post("/api/pricing-versions/", json=version_data)
    assert response.status_code == status.HTTP_201_CREATED

    data = response.json()
    assert data["VersionNumber"] == "2025.2"
    assert data["Description"] == "New test version"
    assert data["CreatedBy"] == "test@example.com"
    assert "Id" in data
    assert "CreatedAt" in data


def test_create_duplicate_version_fails(client: TestClient, db_session: Session) -> None:
    """Test that creating a duplicate version number fails."""
    # Create initial version
    version = PricingVersion(
        VersionNumber="2025.DUP",
        Description="Original version",
        EffectiveDate=date.today(),
        CreatedBy="test@example.com",
        IsCurrent=False,
        IsLocked=False,
    )
    db_session.add(version)
    db_session.commit()

    # Try to create duplicate
    version_data = {
        "VersionNumber": "2025.DUP",
        "Description": "Duplicate version",
        "EffectiveDate": date.today().isoformat(),
        "CreatedBy": "test@example.com",
        "IsCurrent": False,
        "IsLocked": False,
    }

    response = client.post("/api/pricing-versions/", json=version_data)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "already exists" in response.json()["detail"]


def test_get_pricing_version_by_id(client: TestClient, db_session: Session) -> None:
    """Test getting a specific pricing version by ID."""
    version = PricingVersion(
        VersionNumber="2025.GET",
        Description="Test version",
        EffectiveDate=date.today(),
        CreatedBy="test@example.com",
        IsCurrent=False,
        IsLocked=False,
    )
    db_session.add(version)
    db_session.commit()
    db_session.refresh(version)

    version_id = str(version.Id)
    response = client.get(f"/api/pricing-versions/{version_id}")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["Id"] == version_id
    assert data["VersionNumber"] == "2025.GET"


def test_get_nonexistent_pricing_version(client: TestClient) -> None:
    """Test getting a non-existent pricing version returns 404."""
    fake_id = str(uuid4())
    response = client.get(f"/api/pricing-versions/{fake_id}")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_get_current_pricing_version(client: TestClient, db_session: Session) -> None:
    """Test getting the current active pricing version."""
    # Create a current version
    current_version = PricingVersion(
        VersionNumber="2025.CURRENT",
        Description="Current version",
        EffectiveDate=date.today(),
        CreatedBy="test@example.com",
        IsCurrent=True,
        IsLocked=False,
    )
    db_session.add(current_version)
    db_session.commit()

    response = client.get("/api/pricing-versions/current")
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data["IsCurrent"] is True
    assert data["VersionNumber"] == "2025.CURRENT"


def test_get_current_pricing_version_none_exists(client: TestClient) -> None:
    """Test getting current version when none exists returns 404."""
    response = client.get("/api/pricing-versions/current")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_update_pricing_version(client: TestClient, db_session: Session) -> None:
    """Test updating a pricing version."""
    version = PricingVersion(
        VersionNumber="2025.UPDATE",
        Description="Original description",
        EffectiveDate=date.today(),
        CreatedBy="test@example.com",
        IsCurrent=False,
        IsLocked=False,
    )
    db_session.add(version)
    db_session.commit()
    db_session.refresh(version)

    version_id = str(version.Id)
    update_data = {
        "Description": "Updated description",
    }

    response = client.patch(f"/api/pricing-versions/{version_id}", json=update_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data["Description"] == "Updated description"
    assert data["VersionNumber"] == "2025.UPDATE"  # Unchanged


def test_update_nonexistent_version(client: TestClient) -> None:
    """Test updating a non-existent version returns 404."""
    fake_id = str(uuid4())
    update_data = {"Description": "Updated"}

    response = client.patch(f"/api/pricing-versions/{fake_id}", json=update_data)
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_update_locked_version_fails(client: TestClient, db_session: Session) -> None:
    """Test that updating a locked version fails."""
    # Create a locked version
    locked_version = PricingVersion(
        VersionNumber="2025.LOCKED",
        Description="Locked version",
        EffectiveDate=date.today(),
        CreatedBy="test@example.com",
        IsCurrent=False,
        IsLocked=True,
    )
    db_session.add(locked_version)
    db_session.commit()
    db_session.refresh(locked_version)

    version_id = str(locked_version.Id)
    update_data = {"Description": "Trying to update"}

    response = client.patch(f"/api/pricing-versions/{version_id}", json=update_data)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "locked" in response.json()["detail"].lower()


def test_update_locked_version_can_unlock(client: TestClient, db_session: Session) -> None:
    """Test that a locked version can be unlocked."""
    # Create a locked version
    locked_version = PricingVersion(
        VersionNumber="2025.LOCKED2",
        Description="Locked version",
        EffectiveDate=date.today(),
        CreatedBy="test@example.com",
        IsCurrent=False,
        IsLocked=True,
    )
    db_session.add(locked_version)
    db_session.commit()
    db_session.refresh(locked_version)

    version_id = str(locked_version.Id)
    update_data = {"IsLocked": False}

    response = client.patch(f"/api/pricing-versions/{version_id}", json=update_data)
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["IsLocked"] is False


def test_iscurrent_flag_management(client: TestClient, db_session: Session) -> None:
    """Test that setting IsCurrent unsets other versions."""
    # Create two versions
    version1 = PricingVersion(
        VersionNumber="2025.V1",
        Description="Version 1",
        EffectiveDate=date.today(),
        CreatedBy="test@example.com",
        IsCurrent=True,
        IsLocked=False,
    )
    version2 = PricingVersion(
        VersionNumber="2025.V2",
        Description="Version 2",
        EffectiveDate=date.today(),
        CreatedBy="test@example.com",
        IsCurrent=False,
        IsLocked=False,
    )
    db_session.add_all([version1, version2])
    db_session.commit()
    db_session.refresh(version1)
    db_session.refresh(version2)

    # Set version2 as current
    version2_id = str(version2.Id)
    update_data = {"IsCurrent": True}

    response = client.patch(f"/api/pricing-versions/{version2_id}", json=update_data)
    assert response.status_code == status.HTTP_200_OK

    # Check that version1 is no longer current
    db_session.expire(version1)
    db_session.refresh(version1)
    assert version1.IsCurrent is False

    # Check that version2 is current
    db_session.expire(version2)
    db_session.refresh(version2)
    assert version2.IsCurrent is True


def test_delete_pricing_version(client: TestClient, db_session: Session) -> None:
    """Test deleting a pricing version."""
    version = PricingVersion(
        VersionNumber="2025.DELETE",
        Description="To be deleted",
        EffectiveDate=date.today(),
        CreatedBy="test@example.com",
        IsCurrent=False,
        IsLocked=False,
    )
    db_session.add(version)
    db_session.commit()
    db_session.refresh(version)

    version_id = str(version.Id)
    response = client.delete(f"/api/pricing-versions/{version_id}")
    assert response.status_code == status.HTTP_204_NO_CONTENT


def test_delete_nonexistent_version(client: TestClient) -> None:
    """Test deleting a non-existent version returns 404."""
    fake_id = str(uuid4())
    response = client.delete(f"/api/pricing-versions/{fake_id}")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_delete_locked_version_fails(client: TestClient, db_session: Session) -> None:
    """Test that deleting a locked version fails."""
    # Create a locked version
    locked_version = PricingVersion(
        VersionNumber="2025.LOCKED3",
        Description="Locked version",
        EffectiveDate=date.today(),
        CreatedBy="test@example.com",
        IsCurrent=False,
        IsLocked=True,
    )
    db_session.add(locked_version)
    db_session.commit()
    db_session.refresh(locked_version)

    version_id = str(locked_version.Id)
    response = client.delete(f"/api/pricing-versions/{version_id}")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "locked" in response.json()["detail"].lower()
