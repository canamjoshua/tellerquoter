"""Tests for quote API endpoints."""

from datetime import date
from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.core.deps import get_db
from app.main import app
from app.models import (
    PricingVersion,
    Quote,
    QuoteVersion,
    SaaSProduct,
    SKUDefinition,
)


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
    """Clean all quotes and related data before each test."""
    # Clean quotes (cascades to versions and related tables)
    db_session.query(Quote).delete()
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


@pytest.fixture
def pricing_version(db_session: Session) -> PricingVersion:
    """Create a test pricing version."""
    version = PricingVersion(
        VersionNumber="2025.TEST",
        Description="Test pricing version",
        EffectiveDate=date.today(),
        CreatedBy="test@example.com",
        IsCurrent=True,
        IsLocked=False,
    )
    db_session.add(version)
    db_session.commit()
    db_session.refresh(version)
    return version


@pytest.fixture
def saas_product(db_session: Session, pricing_version: PricingVersion) -> SaaSProduct:
    """Create a test SaaS product with tiered pricing."""
    product = SaaSProduct(
        PricingVersionId=pricing_version.Id,
        ProductCode="TEST-SAAS-001",
        Name="Test SaaS Product",
        Description="Test product for quotes",
        Category="Core",
        PricingModel="Tiered",
        Tier1Min=0,
        Tier1Max=1000,
        Tier1Price=Decimal("100.00"),
        Tier2Min=1001,
        Tier2Max=5000,
        Tier2Price=Decimal("80.00"),
        Tier3Min=5001,
        Tier3Max=None,
        Tier3Price=Decimal("60.00"),
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


@pytest.fixture
def sku_definition(db_session: Session, pricing_version: PricingVersion) -> SKUDefinition:
    """Create a test SKU definition."""
    sku = SKUDefinition(
        PricingVersionId=pricing_version.Id,
        SKUCode="TEST-SKU-001",
        Name="Test Setup Service",
        Description="Test setup service",
        Category="Implementation",
        FixedPrice=Decimal("5000.00"),
    )
    db_session.add(sku)
    db_session.commit()
    db_session.refresh(sku)
    return sku


# Quote CRUD Tests


def test_list_quotes_empty(client: TestClient, db_session: Session) -> None:
    """Test listing quotes when database is empty."""
    response = client.get("/api/quotes/")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == []


def test_create_quote(client: TestClient, db_session: Session) -> None:
    """Test creating a new quote."""
    quote_data = {
        "ClientName": "John Doe",
        "ClientOrganization": "Acme Corp",
        "CreatedBy": "test@example.com",
    }

    response = client.post("/api/quotes/", json=quote_data)
    assert response.status_code == status.HTTP_201_CREATED

    data = response.json()
    assert data["ClientName"] == "John Doe"
    assert data["ClientOrganization"] == "Acme Corp"
    assert data["CreatedBy"] == "test@example.com"
    assert data["Status"] == "DRAFT"
    assert "Id" in data
    assert "QuoteNumber" in data
    assert data["QuoteNumber"].startswith("Q-2025-")


def test_quote_number_generation_sequential(client: TestClient, db_session: Session) -> None:
    """Test that quote numbers are generated sequentially."""
    # Create first quote
    quote1_data = {
        "ClientName": "Client 1",
        "CreatedBy": "test@example.com",
    }
    response1 = client.post("/api/quotes/", json=quote1_data)
    assert response1.status_code == status.HTTP_201_CREATED
    quote1_number = response1.json()["QuoteNumber"]

    # Create second quote
    quote2_data = {
        "ClientName": "Client 2",
        "CreatedBy": "test@example.com",
    }
    response2 = client.post("/api/quotes/", json=quote2_data)
    assert response2.status_code == status.HTTP_201_CREATED
    quote2_number = response2.json()["QuoteNumber"]

    # Extract sequence numbers
    seq1 = int(quote1_number.split("-")[-1])
    seq2 = int(quote2_number.split("-")[-1])

    assert seq2 == seq1 + 1


def test_list_quotes_with_data(client: TestClient, db_session: Session) -> None:
    """Test listing quotes with data."""
    # Create a quote
    quote = Quote(
        QuoteNumber="Q-2025-0001",
        ClientName="Test Client",
        ClientOrganization="Test Org",
        CreatedBy="test@example.com",
        Status="DRAFT",
    )
    db_session.add(quote)
    db_session.commit()

    response = client.get("/api/quotes/")
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert len(data) == 1
    assert data[0]["ClientName"] == "Test Client"


def test_list_quotes_filter_by_status(client: TestClient, db_session: Session) -> None:
    """Test filtering quotes by status."""
    # Create quotes with different statuses
    draft_quote = Quote(
        QuoteNumber="Q-2025-0001",
        ClientName="Draft Client",
        CreatedBy="test@example.com",
        Status="DRAFT",
    )
    sent_quote = Quote(
        QuoteNumber="Q-2025-0002",
        ClientName="Sent Client",
        CreatedBy="test@example.com",
        Status="SENT",
    )
    db_session.add_all([draft_quote, sent_quote])
    db_session.commit()

    response = client.get("/api/quotes/?status=DRAFT")
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert len(data) == 1
    assert data[0]["Status"] == "DRAFT"


def test_get_quote_by_id(client: TestClient, db_session: Session) -> None:
    """Test getting a specific quote by ID."""
    quote = Quote(
        QuoteNumber="Q-2025-0001",
        ClientName="Test Client",
        CreatedBy="test@example.com",
        Status="DRAFT",
    )
    db_session.add(quote)
    db_session.commit()
    db_session.refresh(quote)

    quote_id = str(quote.Id)
    response = client.get(f"/api/quotes/{quote_id}")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["Id"] == quote_id
    assert data["ClientName"] == "Test Client"


def test_get_nonexistent_quote(client: TestClient) -> None:
    """Test getting a non-existent quote returns 404."""
    fake_id = str(uuid4())
    response = client.get(f"/api/quotes/{fake_id}")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_update_quote(client: TestClient, db_session: Session) -> None:
    """Test updating a quote."""
    quote = Quote(
        QuoteNumber="Q-2025-0001",
        ClientName="Original Name",
        ClientOrganization="Original Org",
        CreatedBy="test@example.com",
        Status="DRAFT",
    )
    db_session.add(quote)
    db_session.commit()
    db_session.refresh(quote)

    quote_id = str(quote.Id)
    update_data = {
        "ClientName": "Updated Name",
        "ClientOrganization": "Updated Org",
    }

    response = client.patch(f"/api/quotes/{quote_id}", json=update_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data["ClientName"] == "Updated Name"
    assert data["ClientOrganization"] == "Updated Org"


def test_delete_quote(client: TestClient, db_session: Session) -> None:
    """Test deleting a quote."""
    quote = Quote(
        QuoteNumber="Q-2025-0001",
        ClientName="To Be Deleted",
        CreatedBy="test@example.com",
        Status="DRAFT",
    )
    db_session.add(quote)
    db_session.commit()
    db_session.refresh(quote)

    quote_id = str(quote.Id)
    response = client.delete(f"/api/quotes/{quote_id}")
    assert response.status_code == status.HTTP_204_NO_CONTENT

    # Verify deletion
    deleted_quote = db_session.query(Quote).filter(Quote.Id == quote.Id).first()
    assert deleted_quote is None


# QuoteVersion Tests


def test_create_quote_version_basic(
    client: TestClient,
    db_session: Session,
    pricing_version: PricingVersion,
    saas_product: SaaSProduct,
    sku_definition: SKUDefinition,
) -> None:
    """Test creating a basic quote version."""
    # Create quote
    quote = Quote(
        QuoteNumber="Q-2025-0001",
        ClientName="Test Client",
        CreatedBy="test@example.com",
        Status="DRAFT",
    )
    db_session.add(quote)
    db_session.commit()
    db_session.refresh(quote)

    version_data = {
        "QuoteId": str(quote.Id),
        "PricingVersionId": str(pricing_version.Id),
        "ClientData": {"name": "Test Client", "email": "client@example.com"},
        "CreatedBy": "test@example.com",
        "SaaSProducts": [
            {
                "SaaSProductId": str(saas_product.Id),
                "Quantity": "500",
                "Notes": "Test SaaS",
            }
        ],
        "SetupPackages": [
            {
                "SKUDefinitionId": str(sku_definition.Id),
                "Quantity": 1,
                "CustomScopeNotes": "Test setup",
                "SequenceOrder": 1,
            }
        ],
    }

    response = client.post(f"/api/quotes/{quote.Id}/versions/", json=version_data)
    assert response.status_code == status.HTTP_201_CREATED

    data = response.json()
    assert data["VersionNumber"] == 1
    assert data["QuoteId"] == str(quote.Id)
    assert len(data["SaaSProducts"]) == 1
    assert len(data["SetupPackages"]) == 1


def test_create_quote_version_calculates_saas_price_tier1(
    client: TestClient,
    db_session: Session,
    pricing_version: PricingVersion,
    saas_product: SaaSProduct,
) -> None:
    """Test that quote version correctly calculates tier 1 SaaS price."""
    quote = Quote(
        QuoteNumber="Q-2025-0001",
        ClientName="Test Client",
        CreatedBy="test@example.com",
    )
    db_session.add(quote)
    db_session.commit()
    db_session.refresh(quote)

    version_data = {
        "QuoteId": str(quote.Id),
        "PricingVersionId": str(pricing_version.Id),
        "ClientData": {},
        "CreatedBy": "test@example.com",
        "SaaSProducts": [
            {
                "SaaSProductId": str(saas_product.Id),
                "Quantity": "500",  # In tier 1 range (0-1000)
            }
        ],
        "SetupPackages": [],
    }

    response = client.post(f"/api/quotes/{quote.Id}/versions/", json=version_data)
    assert response.status_code == status.HTTP_201_CREATED

    data = response.json()
    assert data["SaaSProducts"][0]["CalculatedMonthlyPrice"] == "100.00"
    assert data["TotalSaaSMonthly"] == "100.00"
    assert data["TotalSaaSAnnualYear1"] == "1200.00"


def test_create_quote_version_calculates_saas_price_tier2(
    client: TestClient,
    db_session: Session,
    pricing_version: PricingVersion,
    saas_product: SaaSProduct,
) -> None:
    """Test that quote version correctly calculates tier 2 SaaS price."""
    quote = Quote(
        QuoteNumber="Q-2025-0001",
        ClientName="Test Client",
        CreatedBy="test@example.com",
    )
    db_session.add(quote)
    db_session.commit()
    db_session.refresh(quote)

    version_data = {
        "QuoteId": str(quote.Id),
        "PricingVersionId": str(pricing_version.Id),
        "ClientData": {},
        "CreatedBy": "test@example.com",
        "SaaSProducts": [
            {
                "SaaSProductId": str(saas_product.Id),
                "Quantity": "3000",  # In tier 2 range (1001-5000)
            }
        ],
        "SetupPackages": [],
    }

    response = client.post(f"/api/quotes/{quote.Id}/versions/", json=version_data)
    assert response.status_code == status.HTTP_201_CREATED

    data = response.json()
    assert data["SaaSProducts"][0]["CalculatedMonthlyPrice"] == "80.00"
    assert data["TotalSaaSMonthly"] == "80.00"


def test_create_quote_version_calculates_saas_price_tier3(
    client: TestClient,
    db_session: Session,
    pricing_version: PricingVersion,
    saas_product: SaaSProduct,
) -> None:
    """Test that quote version correctly calculates tier 3 SaaS price."""
    quote = Quote(
        QuoteNumber="Q-2025-0001",
        ClientName="Test Client",
        CreatedBy="test@example.com",
    )
    db_session.add(quote)
    db_session.commit()
    db_session.refresh(quote)

    version_data = {
        "QuoteId": str(quote.Id),
        "PricingVersionId": str(pricing_version.Id),
        "ClientData": {},
        "CreatedBy": "test@example.com",
        "SaaSProducts": [
            {
                "SaaSProductId": str(saas_product.Id),
                "Quantity": "10000",  # In tier 3 range (5001+)
            }
        ],
        "SetupPackages": [],
    }

    response = client.post(f"/api/quotes/{quote.Id}/versions/", json=version_data)
    assert response.status_code == status.HTTP_201_CREATED

    data = response.json()
    assert data["SaaSProducts"][0]["CalculatedMonthlyPrice"] == "60.00"
    assert data["TotalSaaSMonthly"] == "60.00"


def test_create_quote_version_calculates_setup_price(
    client: TestClient,
    db_session: Session,
    pricing_version: PricingVersion,
    sku_definition: SKUDefinition,
) -> None:
    """Test that quote version correctly calculates setup package price."""
    quote = Quote(
        QuoteNumber="Q-2025-0001",
        ClientName="Test Client",
        CreatedBy="test@example.com",
    )
    db_session.add(quote)
    db_session.commit()
    db_session.refresh(quote)

    version_data = {
        "QuoteId": str(quote.Id),
        "PricingVersionId": str(pricing_version.Id),
        "ClientData": {},
        "CreatedBy": "test@example.com",
        "SaaSProducts": [],
        "SetupPackages": [
            {
                "SKUDefinitionId": str(sku_definition.Id),
                "Quantity": 2,  # 2 x $5000 = $10000
            }
        ],
    }

    response = client.post(f"/api/quotes/{quote.Id}/versions/", json=version_data)
    assert response.status_code == status.HTTP_201_CREATED

    data = response.json()
    assert data["SetupPackages"][0]["CalculatedPrice"] == "10000.00"
    assert data["TotalSetupPackages"] == "10000.00"


def test_create_quote_version_auto_increments_version_number(
    client: TestClient,
    db_session: Session,
    pricing_version: PricingVersion,
) -> None:
    """Test that version numbers auto-increment."""
    quote = Quote(
        QuoteNumber="Q-2025-0001",
        ClientName="Test Client",
        CreatedBy="test@example.com",
    )
    db_session.add(quote)
    db_session.commit()
    db_session.refresh(quote)

    version_data = {
        "QuoteId": str(quote.Id),
        "PricingVersionId": str(pricing_version.Id),
        "ClientData": {},
        "CreatedBy": "test@example.com",
        "SaaSProducts": [],
        "SetupPackages": [],
    }

    # Create first version
    response1 = client.post(f"/api/quotes/{quote.Id}/versions/", json=version_data)
    assert response1.status_code == status.HTTP_201_CREATED
    assert response1.json()["VersionNumber"] == 1

    # Create second version
    response2 = client.post(f"/api/quotes/{quote.Id}/versions/", json=version_data)
    assert response2.status_code == status.HTTP_201_CREATED
    assert response2.json()["VersionNumber"] == 2


def test_list_quote_versions(
    client: TestClient,
    db_session: Session,
    pricing_version: PricingVersion,
) -> None:
    """Test listing all versions of a quote."""
    quote = Quote(
        QuoteNumber="Q-2025-0001",
        ClientName="Test Client",
        CreatedBy="test@example.com",
    )
    db_session.add(quote)
    db_session.commit()
    db_session.refresh(quote)

    # Create two versions
    for i in range(2):
        version = QuoteVersion(
            QuoteId=quote.Id,
            VersionNumber=i + 1,
            PricingVersionId=pricing_version.Id,
            ClientData={},
            CreatedBy="test@example.com",
        )
        db_session.add(version)
    db_session.commit()

    response = client.get(f"/api/quotes/{quote.Id}/versions/")
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert len(data) == 2


def test_get_quote_version_by_number(
    client: TestClient,
    db_session: Session,
    pricing_version: PricingVersion,
) -> None:
    """Test getting a specific version by number."""
    quote = Quote(
        QuoteNumber="Q-2025-0001",
        ClientName="Test Client",
        CreatedBy="test@example.com",
    )
    db_session.add(quote)
    db_session.commit()
    db_session.refresh(quote)

    version = QuoteVersion(
        QuoteId=quote.Id,
        VersionNumber=1,
        PricingVersionId=pricing_version.Id,
        ClientData={},
        CreatedBy="test@example.com",
    )
    db_session.add(version)
    db_session.commit()

    response = client.get(f"/api/quotes/{quote.Id}/versions/1")
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data["VersionNumber"] == 1


def test_update_quote_version(
    client: TestClient,
    db_session: Session,
    pricing_version: PricingVersion,
) -> None:
    """Test updating a quote version."""
    quote = Quote(
        QuoteNumber="Q-2025-0001",
        ClientName="Test Client",
        CreatedBy="test@example.com",
    )
    db_session.add(quote)
    db_session.commit()
    db_session.refresh(quote)

    version = QuoteVersion(
        QuoteId=quote.Id,
        VersionNumber=1,
        PricingVersionId=pricing_version.Id,
        ClientData={"original": "data"},
        CreatedBy="test@example.com",
        VersionStatus="DRAFT",
    )
    db_session.add(version)
    db_session.commit()

    update_data = {
        "ClientData": {"updated": "data"},
        "ProjectionYears": 7,
    }

    response = client.patch(
        f"/api/quotes/{quote.Id}/versions/1",
        json=update_data,
    )
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data["ClientData"] == {"updated": "data"}
    assert data["ProjectionYears"] == 7


def test_update_sent_version_fails(
    client: TestClient,
    db_session: Session,
    pricing_version: PricingVersion,
) -> None:
    """Test that updating a SENT version fails."""
    quote = Quote(
        QuoteNumber="Q-2025-0001",
        ClientName="Test Client",
        CreatedBy="test@example.com",
    )
    db_session.add(quote)
    db_session.commit()
    db_session.refresh(quote)

    version = QuoteVersion(
        QuoteId=quote.Id,
        VersionNumber=1,
        PricingVersionId=pricing_version.Id,
        ClientData={},
        CreatedBy="test@example.com",
        VersionStatus="SENT",
    )
    db_session.add(version)
    db_session.commit()

    update_data = {"ProjectionYears": 7}

    response = client.patch(
        f"/api/quotes/{quote.Id}/versions/1",
        json=update_data,
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "sent" in response.json()["detail"].lower()


def test_update_accepted_version_fails(
    client: TestClient,
    db_session: Session,
    pricing_version: PricingVersion,
) -> None:
    """Test that updating an ACCEPTED version fails."""
    quote = Quote(
        QuoteNumber="Q-2025-0001",
        ClientName="Test Client",
        CreatedBy="test@example.com",
    )
    db_session.add(quote)
    db_session.commit()
    db_session.refresh(quote)

    version = QuoteVersion(
        QuoteId=quote.Id,
        VersionNumber=1,
        PricingVersionId=pricing_version.Id,
        ClientData={},
        CreatedBy="test@example.com",
        VersionStatus="ACCEPTED",
    )
    db_session.add(version)
    db_session.commit()

    update_data = {"ProjectionYears": 7}

    response = client.patch(
        f"/api/quotes/{quote.Id}/versions/1",
        json=update_data,
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "accepted" in response.json()["detail"].lower()


def test_delete_quote_version(
    client: TestClient,
    db_session: Session,
    pricing_version: PricingVersion,
) -> None:
    """Test deleting a quote version."""
    quote = Quote(
        QuoteNumber="Q-2025-0001",
        ClientName="Test Client",
        CreatedBy="test@example.com",
    )
    db_session.add(quote)
    db_session.commit()
    db_session.refresh(quote)

    version = QuoteVersion(
        QuoteId=quote.Id,
        VersionNumber=1,
        PricingVersionId=pricing_version.Id,
        ClientData={},
        CreatedBy="test@example.com",
        VersionStatus="DRAFT",
    )
    db_session.add(version)
    db_session.commit()
    db_session.refresh(version)

    response = client.delete(f"/api/quotes/{quote.Id}/versions/1")
    assert response.status_code == status.HTTP_204_NO_CONTENT

    # Verify deletion
    deleted_version = db_session.query(QuoteVersion).filter(QuoteVersion.Id == version.Id).first()
    assert deleted_version is None


def test_delete_sent_version_fails(
    client: TestClient,
    db_session: Session,
    pricing_version: PricingVersion,
) -> None:
    """Test that deleting a SENT version fails."""
    quote = Quote(
        QuoteNumber="Q-2025-0001",
        ClientName="Test Client",
        CreatedBy="test@example.com",
    )
    db_session.add(quote)
    db_session.commit()
    db_session.refresh(quote)

    version = QuoteVersion(
        QuoteId=quote.Id,
        VersionNumber=1,
        PricingVersionId=pricing_version.Id,
        ClientData={},
        CreatedBy="test@example.com",
        VersionStatus="SENT",
    )
    db_session.add(version)
    db_session.commit()

    response = client.delete(f"/api/quotes/{quote.Id}/versions/1")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "sent" in response.json()["detail"].lower()


def test_cascade_delete_quote_deletes_versions(
    client: TestClient,
    db_session: Session,
    pricing_version: PricingVersion,
) -> None:
    """Test that deleting a quote cascades to delete its versions."""
    quote = Quote(
        QuoteNumber="Q-2025-0001",
        ClientName="Test Client",
        CreatedBy="test@example.com",
    )
    db_session.add(quote)
    db_session.commit()
    db_session.refresh(quote)

    version = QuoteVersion(
        QuoteId=quote.Id,
        VersionNumber=1,
        PricingVersionId=pricing_version.Id,
        ClientData={},
        CreatedBy="test@example.com",
    )
    db_session.add(version)
    db_session.commit()
    db_session.refresh(version)

    version_id = version.Id

    # Delete quote
    response = client.delete(f"/api/quotes/{quote.Id}")
    assert response.status_code == status.HTTP_204_NO_CONTENT

    # Verify version was also deleted
    deleted_version = db_session.query(QuoteVersion).filter(QuoteVersion.Id == version_id).first()
    assert deleted_version is None
