"""Tests for quote configuration API endpoints."""

from datetime import date
from decimal import Decimal

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.core.deps import get_db
from app.main import app
from app.models import (
    ApplicationModule,
    MatureIntegration,
    PricingVersion,
    Quote,
    QuoteVersion,
    QuoteVersionSaaSProduct,
    QuoteVersionSetupPackage,
    Referrer,
    SaaSProduct,
    SKUDefinition,
    TextSnippet,
    TravelZone,
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
    """Clean all relevant tables before each test.

    Delete child tables first to avoid foreign key violations.
    """
    # Delete quote-related tables (deepest first)
    db_session.query(QuoteVersionSaaSProduct).delete()
    db_session.query(QuoteVersionSetupPackage).delete()
    db_session.query(QuoteVersion).delete()
    db_session.query(Quote).delete()

    # Delete all other tables that reference PricingVersion
    db_session.query(SKUDefinition).delete()
    db_session.query(SaaSProduct).delete()
    db_session.query(TravelZone).delete()
    db_session.query(MatureIntegration).delete()
    db_session.query(ApplicationModule).delete()
    db_session.query(TextSnippet).delete()
    db_session.query(Referrer).delete()

    # Finally delete PricingVersion
    db_session.query(PricingVersion).delete()
    db_session.commit()
    yield


@pytest.fixture
def pricing_version(db_session: Session) -> PricingVersion:
    """Create a test pricing version."""
    version = PricingVersion(
        VersionNumber="2025.TEST",
        Description="Test version for quote config",
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
def saas_products(db_session: Session, pricing_version: PricingVersion) -> dict:
    """Create test SaaS products."""
    products = {
        "basic": SaaSProduct(
            PricingVersionId=pricing_version.Id,
            ProductCode="TELLER-BASIC",
            Name="Teller Basic",
            Description="Basic Teller (5 users, single department)",
            Category="Core",
            PricingModel="Tiered",
            Tier1Min=0,
            Tier1Max=5,
            Tier1Price=Decimal("995.00"),
            IsActive=True,
            IsRequired=True,
            SortOrder=1,
        ),
        "standard": SaaSProduct(
            PricingVersionId=pricing_version.Id,
            ProductCode="TELLER-STANDARD",
            Name="Teller Standard",
            Description="Standard Teller (5 users, multi-department)",
            Category="Core",
            PricingModel="Tiered",
            Tier1Min=0,
            Tier1Max=5,
            Tier1Price=Decimal("2950.00"),
            IsActive=True,
            IsRequired=True,
            SortOrder=2,
        ),
        "additional_user": SaaSProduct(
            PricingVersionId=pricing_version.Id,
            ProductCode="ADDITIONAL-USER",
            Name="Additional User",
            Description="Additional concurrent user (beyond 5 included)",
            Category="Optional",
            PricingModel="Flat",
            Tier1Min=0,
            Tier1Max=999,
            Tier1Price=Decimal("60.00"),
            IsActive=True,
            IsRequired=False,
            SortOrder=3,
        ),
        "bidirectional_interface": SaaSProduct(
            PricingVersionId=pricing_version.Id,
            ProductCode="BIDIRECTIONAL-INTERFACE",
            Name="Bi-Directional Interface",
            Description="Real-time bi-directional interface",
            Category="Optional",
            PricingModel="Flat",
            Tier1Min=0,
            Tier1Max=999,
            Tier1Price=Decimal("285.00"),
            IsActive=True,
            IsRequired=False,
            SortOrder=4,
        ),
        "payment_import": SaaSProduct(
            PricingVersionId=pricing_version.Id,
            ProductCode="PAYMENT-IMPORT-INTERFACE",
            Name="Payment Import Interface",
            Description="Import payments from external systems",
            Category="Optional",
            PricingModel="Flat",
            Tier1Min=0,
            Tier1Max=999,
            Tier1Price=Decimal("170.00"),
            IsActive=True,
            IsRequired=False,
            SortOrder=5,
        ),
    }

    for product in products.values():
        db_session.add(product)
    db_session.commit()

    return products


@pytest.fixture
def mature_integrations(db_session: Session) -> dict:
    """Create test mature integrations."""
    integrations = {
        "tyler_munis": MatureIntegration(
            IntegrationCode="TYLER-MUNIS",
            SystemName="Tyler Munis",
            Vendor="Tyler Technologies",
            Comments="Financial management system",
            IsActive=True,
        ),
    }

    for integration in integrations.values():
        db_session.add(integration)
    db_session.commit()

    return integrations


@pytest.fixture
def setup_skus(db_session: Session, pricing_version: PricingVersion) -> dict:
    """Create test setup SKUs."""
    skus = {
        "basic_setup": SKUDefinition(
            PricingVersionId=pricing_version.Id,
            SKUCode="ORG-SETUP-BASIC",
            Name="Basic Setup",
            Description="Basic setup package",
            Category="Setup",
            FixedPrice=Decimal("3680.00"),
            IsActive=True,
            SortOrder=1,
        ),
        "enterprise_setup": SKUDefinition(
            PricingVersionId=pricing_version.Id,
            SKUCode="ORG-SETUP-ENTERPRISE",
            Name="Enterprise Setup",
            Description="Enterprise setup package",
            Category="Setup",
            FixedPrice=Decimal("5520.00"),
            IsActive=True,
            SortOrder=2,
        ),
        "additional_dept": SKUDefinition(
            PricingVersionId=pricing_version.Id,
            SKUCode="ORG-SETUP-ADDITIONAL-DEPT",
            Name="Additional Department Setup",
            Description="Setup for each additional department beyond 2",
            Category="Setup",
            FixedPrice=Decimal("1840.00"),
            IsActive=True,
            SortOrder=3,
        ),
        "pm_standard": SKUDefinition(
            PricingVersionId=pricing_version.Id,
            SKUCode="PM-STANDARD",
            Name="Standard Project Management",
            Description="Standard PM (1-2 months)",
            Category="ProjectManagement",
            FixedPrice=Decimal("6000.00"),
            IsActive=True,
            SortOrder=4,
        ),
        "pm_enterprise": SKUDefinition(
            PricingVersionId=pricing_version.Id,
            SKUCode="PM-ENTERPRISE",
            Name="Enterprise Project Management",
            Description="Enterprise PM (3+ months or complex)",
            Category="ProjectManagement",
            FixedPrice=Decimal("15000.00"),
            IsActive=True,
            SortOrder=5,
        ),
        "integration_mature": SKUDefinition(
            PricingVersionId=pricing_version.Id,
            SKUCode="INTEGRATION-MATURE",
            Name="Mature Integration",
            Description="Integration with mature/existing interface",
            Category="Integration",
            FixedPrice=Decimal("2000.00"),
            IsActive=True,
            SortOrder=6,
        ),
        "integration_custom": SKUDefinition(
            PricingVersionId=pricing_version.Id,
            SKUCode="INTEGRATION-CUSTOM",
            Name="Custom Integration",
            Description="Custom integration development",
            Category="Integration",
            FixedPrice=Decimal("8000.00"),
            IsActive=True,
            SortOrder=7,
        ),
        "form_tier1": SKUDefinition(
            PricingVersionId=pricing_version.Id,
            SKUCode="ONLINE-FORM-TIER1",
            Name="Online Form Tier 1",
            Description="Basic form (<15 fields, no complex calcs)",
            Category="OnlineForm",
            FixedPrice=Decimal("4600.00"),
            IsActive=True,
            SortOrder=8,
        ),
        "form_tier2": SKUDefinition(
            PricingVersionId=pricing_version.Id,
            SKUCode="ONLINE-FORM-TIER2",
            Name="Online Form Tier 2",
            Description="Moderate form (15-30 fields or complex calcs)",
            Category="OnlineForm",
            FixedPrice=Decimal("9200.00"),
            IsActive=True,
            SortOrder=9,
        ),
        "form_tier3": SKUDefinition(
            PricingVersionId=pricing_version.Id,
            SKUCode="ONLINE-FORM-TIER3",
            Name="Online Form Tier 3",
            Description="Complex form (>30 fields or custom code)",
            Category="OnlineForm",
            FixedPrice=Decimal("16560.00"),
            IsActive=True,
            SortOrder=10,
        ),
        "form_workflow": SKUDefinition(
            PricingVersionId=pricing_version.Id,
            SKUCode="ONLINE-FORM-WORKFLOW-ADDON",
            Name="Form Workflow Addon",
            Description="Workflow for online form",
            Category="OnlineForm",
            FixedPrice=Decimal("5520.00"),
            IsActive=True,
            SortOrder=11,
        ),
        "training_base": SKUDefinition(
            PricingVersionId=pricing_version.Id,
            SKUCode="TRAINING-SUITE",
            Name="Base Training Package",
            Description="Standard training sessions",
            Category="Training",
            FixedPrice=Decimal("3000.00"),
            IsActive=True,
            SortOrder=12,
        ),
        "training_revenue": SKUDefinition(
            PricingVersionId=pricing_version.Id,
            SKUCode="TRAINING-REVENUE-ADDON",
            Name="Revenue Submission Training",
            Description="Additional training for Revenue Submission module",
            Category="Training",
            FixedPrice=Decimal("1000.00"),
            IsActive=True,
            SortOrder=13,
        ),
        "training_cashiering": SKUDefinition(
            PricingVersionId=pricing_version.Id,
            SKUCode="TRAINING-END-USER-CASHIERING",
            Name="Additional Cashiering Training",
            Description="Extra cashiering training session",
            Category="Training",
            FixedPrice=Decimal("500.00"),
            IsActive=True,
            SortOrder=14,
        ),
    }

    for sku in skus.values():
        db_session.add(sku)
    db_session.commit()

    return skus


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


# ============================================================================
# SaaS Products Endpoint Tests
# ============================================================================


def test_preview_saas_products_standard(client: TestClient, saas_products: dict) -> None:
    """Test SaaS product preview for Teller Standard."""
    request_data = {
        "product_type": "standard",
        "additional_users": 0,
        "bidirectional_interfaces": 0,
        "payment_import_interfaces": 0,
    }

    response = client.post("/api/quote-config/preview/saas-products", json=request_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert "selected_products" in data
    assert "total_monthly_cost" in data
    assert "summary" in data

    # Should have 1 product (Teller Standard)
    assert len(data["selected_products"]) == 1
    assert data["selected_products"][0]["product_code"] == "TELLER-STANDARD"
    assert data["selected_products"][0]["name"] == "Teller Standard"
    assert data["selected_products"][0]["monthly_price"] == 2950.0
    assert data["total_monthly_cost"] == 2950.0


def test_preview_saas_products_basic(client: TestClient, saas_products: dict) -> None:
    """Test SaaS product preview for Teller Basic."""
    request_data = {
        "product_type": "basic",
        "additional_users": 0,
        "bidirectional_interfaces": 0,
        "payment_import_interfaces": 0,
    }

    response = client.post("/api/quote-config/preview/saas-products", json=request_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert len(data["selected_products"]) == 1
    assert data["selected_products"][0]["product_code"] == "TELLER-BASIC"
    assert data["selected_products"][0]["monthly_price"] == 995.0
    assert data["total_monthly_cost"] == 995.0


def test_preview_saas_products_with_additional_users(
    client: TestClient, saas_products: dict
) -> None:
    """Test SaaS product preview with additional users."""
    request_data = {
        "product_type": "standard",
        "additional_users": 10,
        "bidirectional_interfaces": 0,
        "payment_import_interfaces": 0,
    }

    response = client.post("/api/quote-config/preview/saas-products", json=request_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    # Should have 2 products: Teller Standard + Additional Users
    assert len(data["selected_products"]) == 2

    # Check for additional users
    additional_user = next(
        p for p in data["selected_products"] if p["product_code"] == "ADDITIONAL-USER"
    )
    assert additional_user["quantity"] == 10
    assert additional_user["monthly_price"] == 60.0
    assert additional_user["total_monthly_price"] == 600.0

    # Total should be 2950 + (10 * 60) = 3550
    assert data["total_monthly_cost"] == 3550.0


def test_preview_saas_products_with_interfaces(client: TestClient, saas_products: dict) -> None:
    """Test SaaS product preview with bi-directional and payment import interfaces."""
    request_data = {
        "product_type": "standard",
        "additional_users": 0,
        "bidirectional_interfaces": 2,
        "payment_import_interfaces": 1,
    }

    response = client.post("/api/quote-config/preview/saas-products", json=request_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    # Should have 3 products: Teller Standard + 2x Bidirectional + 1x Payment Import
    assert len(data["selected_products"]) == 3

    # Check bidirectional interfaces
    bidirectional = next(
        p for p in data["selected_products"] if p["product_code"] == "BIDIRECTIONAL-INTERFACE"
    )
    assert bidirectional["quantity"] == 2
    assert bidirectional["total_monthly_price"] == 570.0  # 2 * 285

    # Check payment import
    payment_import = next(
        p for p in data["selected_products"] if p["product_code"] == "PAYMENT-IMPORT-INTERFACE"
    )
    assert payment_import["quantity"] == 1
    assert payment_import["total_monthly_price"] == 170.0

    # Total: 2950 + 570 + 170 = 3690
    assert data["total_monthly_cost"] == 3690.0


def test_preview_saas_products_full_config(client: TestClient, saas_products: dict) -> None:
    """Test SaaS product preview with all options."""
    request_data = {
        "product_type": "standard",
        "additional_users": 5,
        "bidirectional_interfaces": 1,
        "payment_import_interfaces": 2,
    }

    response = client.post("/api/quote-config/preview/saas-products", json=request_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    # Should have 4 products
    assert len(data["selected_products"]) == 4

    # Total: 2950 + (5*60) + 285 + (2*170) = 2950 + 300 + 285 + 340 = 3875
    assert data["total_monthly_cost"] == 3875.0


def test_preview_saas_products_invalid_type(client: TestClient, saas_products: dict) -> None:
    """Test SaaS product preview with invalid product type defaults to standard."""
    request_data = {
        "product_type": "invalid",
        "additional_users": 0,
        "bidirectional_interfaces": 0,
        "payment_import_interfaces": 0,
    }

    response = client.post("/api/quote-config/preview/saas-products", json=request_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    # Should default to Teller Standard
    assert data["selected_products"][0]["product_code"] == "TELLER-STANDARD"


# ============================================================================
# Organization Setup Endpoint Tests
# ============================================================================


def test_preview_organization_setup_single_dept(client: TestClient, setup_skus: dict) -> None:
    """Test organization setup preview for single department."""
    request_data = {"num_departments": 1, "additional_dept_count": 0}

    response = client.post("/api/quote-config/preview/organization-setup", json=request_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert len(data["selected_skus"]) == 1
    assert data["selected_skus"][0]["sku_code"] == "ORG-SETUP-BASIC"
    assert data["total_setup_cost"] == 3680.0


def test_preview_organization_setup_two_depts(client: TestClient, setup_skus: dict) -> None:
    """Test organization setup preview for two departments."""
    request_data = {"num_departments": 2, "additional_dept_count": 0}

    response = client.post("/api/quote-config/preview/organization-setup", json=request_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert len(data["selected_skus"]) == 1
    assert data["selected_skus"][0]["sku_code"] == "ORG-SETUP-ENTERPRISE"
    assert data["total_setup_cost"] == 5520.0


def test_preview_organization_setup_multiple_depts(client: TestClient, setup_skus: dict) -> None:
    """Test organization setup preview for multiple departments."""
    request_data = {"num_departments": 5, "additional_dept_count": 0}

    response = client.post("/api/quote-config/preview/organization-setup", json=request_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    # Should have 2 SKUs: Enterprise + Additional Dept
    assert len(data["selected_skus"]) == 2

    # Check for enterprise setup
    enterprise = next(
        sku for sku in data["selected_skus"] if sku["sku_code"] == "ORG-SETUP-ENTERPRISE"
    )
    assert enterprise["quantity"] == 1

    # Check for additional departments (5 total - 2 included = 3 additional)
    additional = next(
        sku for sku in data["selected_skus"] if sku["sku_code"] == "ORG-SETUP-ADDITIONAL-DEPT"
    )
    assert additional["quantity"] == 3

    # Total: 5520 + (3 * 1840) = 11040
    assert data["total_setup_cost"] == 11040.0


# ============================================================================
# Project Management Endpoint Tests
# ============================================================================


def test_preview_project_management_standard(client: TestClient, setup_skus: dict) -> None:
    """Test PM preview for standard project (short duration, not complex)."""
    request_data = {"project_duration_months": 2, "is_complex": False}

    response = client.post("/api/quote-config/preview/project-management", json=request_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert len(data["selected_skus"]) == 1
    assert data["selected_skus"][0]["sku_code"] == "PM-STANDARD"
    # PM price is multiplied by duration: 6000 * 2 months = 12000
    assert data["total_setup_cost"] == 12000.0


def test_preview_project_management_enterprise_by_duration(
    client: TestClient, setup_skus: dict
) -> None:
    """Test PM preview for enterprise project (long duration)."""
    request_data = {"project_duration_months": 6, "is_complex": False}

    response = client.post("/api/quote-config/preview/project-management", json=request_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert len(data["selected_skus"]) == 1
    assert data["selected_skus"][0]["sku_code"] == "PM-ENTERPRISE"
    # PM price is multiplied by duration: 15000 * 6 months = 90000
    assert data["total_setup_cost"] == 90000.0


def test_preview_project_management_enterprise_by_complexity(
    client: TestClient, setup_skus: dict
) -> None:
    """Test PM preview for enterprise project (complex)."""
    request_data = {"project_duration_months": 2, "is_complex": True}

    response = client.post("/api/quote-config/preview/project-management", json=request_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert len(data["selected_skus"]) == 1
    assert data["selected_skus"][0]["sku_code"] == "PM-ENTERPRISE"
    # PM price is multiplied by duration: 15000 * 2 months = 30000
    assert data["total_setup_cost"] == 30000.0


# ============================================================================
# Integration Endpoint Tests
# ============================================================================


def test_preview_integration_mature(
    client: TestClient, setup_skus: dict, mature_integrations: dict
) -> None:
    """Test integration preview for mature system."""
    request_data = {"system_name": "Tyler Munis", "vendor": "Tyler Technologies"}

    response = client.post("/api/quote-config/preview/integration", json=request_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert len(data["selected_skus"]) == 1
    # Should select mature integration for known system
    assert data["selected_skus"][0]["sku_code"] == "INTEGRATION-MATURE"
    assert data["total_setup_cost"] == 2000.0


def test_preview_integration_custom(client: TestClient, setup_skus: dict) -> None:
    """Test integration preview for custom system."""
    request_data = {"system_name": "Custom Legacy System", "vendor": None}

    response = client.post("/api/quote-config/preview/integration", json=request_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert len(data["selected_skus"]) == 1
    # Should select custom integration for unknown system
    assert data["selected_skus"][0]["sku_code"] == "INTEGRATION-CUSTOM"
    assert data["total_setup_cost"] == 8000.0


# ============================================================================
# Online Form Endpoint Tests
# ============================================================================


def test_preview_online_form_simple(client: TestClient, setup_skus: dict) -> None:
    """Test online form preview for simple form."""
    request_data = {
        "form_name": "Contact Form",
        "num_fields": 10,
        "complex_calculations": False,
        "custom_code": False,
        "workflow_required": False,
    }

    response = client.post("/api/quote-config/preview/online-form", json=request_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert len(data["selected_skus"]) == 1
    # <15 fields, no complex calcs = Tier 1
    assert data["selected_skus"][0]["sku_code"] == "ONLINE-FORM-TIER1"
    assert data["total_setup_cost"] == 4600.0


def test_preview_online_form_complex(client: TestClient, setup_skus: dict) -> None:
    """Test online form preview for complex form."""
    request_data = {
        "form_name": "Revenue Calculation Form",
        "num_fields": 30,
        "complex_calculations": True,
        "custom_code": True,
        "workflow_required": True,
    }

    response = client.post("/api/quote-config/preview/online-form", json=request_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    # Custom code triggers Tier 3 + workflow addon = 2 SKUs
    assert len(data["selected_skus"]) == 2
    assert data["selected_skus"][0]["sku_code"] == "ONLINE-FORM-TIER3"
    # Tier 3 (16560) + Workflow (5520) = 22080
    assert data["total_setup_cost"] == 22080.0


def test_preview_online_form_complex_by_field_count(client: TestClient, setup_skus: dict) -> None:
    """Test online form preview with many fields triggers tier 2."""
    request_data = {
        "form_name": "Large Form",
        "num_fields": 25,
        "complex_calculations": False,
        "custom_code": False,
        "workflow_required": False,
    }

    response = client.post("/api/quote-config/preview/online-form", json=request_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    # 15-30 fields, no custom code = Tier 2
    assert data["selected_skus"][0]["sku_code"] == "ONLINE-FORM-TIER2"


# ============================================================================
# Training Endpoint Tests
# ============================================================================


def test_preview_training_base_only(client: TestClient, setup_skus: dict) -> None:
    """Test training preview with only base training."""
    request_data = {
        "has_revenue_submission": False,
        "additional_cashiering_sessions": 0,
    }

    response = client.post("/api/quote-config/preview/training", json=request_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert len(data["selected_skus"]) == 1
    assert data["selected_skus"][0]["sku_code"] == "TRAINING-SUITE"
    assert data["total_setup_cost"] == 3000.0


def test_preview_training_with_revenue_submission(client: TestClient, setup_skus: dict) -> None:
    """Test training preview with revenue submission module."""
    request_data = {
        "has_revenue_submission": True,
        "additional_cashiering_sessions": 0,
    }

    response = client.post("/api/quote-config/preview/training", json=request_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert len(data["selected_skus"]) == 2

    # Check for revenue submission training
    revenue_training = next(
        sku for sku in data["selected_skus"] if sku["sku_code"] == "TRAINING-REVENUE-ADDON"
    )
    assert revenue_training["quantity"] == 1

    # Total: 3000 + 1000 = 4000
    assert data["total_setup_cost"] == 4000.0


def test_preview_training_with_additional_cashiering(client: TestClient, setup_skus: dict) -> None:
    """Test training preview with additional cashiering sessions."""
    request_data = {
        "has_revenue_submission": False,
        "additional_cashiering_sessions": 3,
    }

    response = client.post("/api/quote-config/preview/training", json=request_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert len(data["selected_skus"]) == 2

    # Check for additional cashiering training
    cashiering = next(
        sku for sku in data["selected_skus"] if sku["sku_code"] == "TRAINING-END-USER-CASHIERING"
    )
    assert cashiering["quantity"] == 3

    # Total: 3000 + (3 * 500) = 4500
    assert data["total_setup_cost"] == 4500.0


def test_preview_training_full_package(client: TestClient, setup_skus: dict) -> None:
    """Test training preview with all options."""
    request_data = {
        "has_revenue_submission": True,
        "additional_cashiering_sessions": 2,
    }

    response = client.post("/api/quote-config/preview/training", json=request_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert len(data["selected_skus"]) == 3

    # Total: 3000 + 1000 + (2 * 500) = 5000
    assert data["total_setup_cost"] == 5000.0


# ============================================================================
# Error Handling Tests
# ============================================================================


def test_preview_saas_products_validation_error(client: TestClient) -> None:
    """Test SaaS products endpoint with invalid data."""
    request_data = {
        "product_type": "standard",
        "additional_users": -5,  # Invalid: negative
    }

    response = client.post("/api/quote-config/preview/saas-products", json=request_data)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_preview_organization_setup_validation_error(client: TestClient) -> None:
    """Test organization setup endpoint with invalid data."""
    request_data = {
        "num_departments": 0,  # Invalid: must be >= 1
    }

    response = client.post("/api/quote-config/preview/organization-setup", json=request_data)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_preview_project_management_validation_error(client: TestClient) -> None:
    """Test project management endpoint with invalid data."""
    request_data = {
        "project_duration_months": 0,  # Invalid: must be >= 1
        "is_complex": False,
    }

    response = client.post("/api/quote-config/preview/project-management", json=request_data)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_preview_online_form_validation_error(client: TestClient) -> None:
    """Test online form endpoint with invalid data."""
    request_data = {
        "form_name": "Test Form",
        "num_fields": 0,  # Invalid: must be >= 1
    }

    response = client.post("/api/quote-config/preview/online-form", json=request_data)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
