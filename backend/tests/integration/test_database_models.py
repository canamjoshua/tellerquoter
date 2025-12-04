"""Integration tests for database models.

Tests database connectivity, model CRUD operations, and relationships.
Uses a test database to ensure isolation from development data.
"""

from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.models import PricingVersion, SaaSProduct, SKUDefinition, TravelZone


@pytest.fixture(scope="module")
def engine():
    """Create a test database engine."""
    # Use the same database URL from settings
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
def sample_pricing_version(db_session: Session) -> PricingVersion:
    """Create a sample pricing version for testing."""
    version = PricingVersion(
        VersionNumber="2025.TEST",
        Description="Test pricing version",
        EffectiveDate=date(2025, 1, 1),
        ExpirationDate=None,
        CreatedBy="test_user",
        IsCurrent=True,
        IsLocked=False,
    )
    db_session.add(version)
    db_session.commit()
    db_session.refresh(version)
    return version


class TestDatabaseConnection:
    """Test basic database connectivity."""

    def test_database_connection(self, engine):
        """Test that we can connect to the database."""
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            assert result.scalar() == 1

    def test_tables_exist(self, engine):
        """Test that all expected tables exist."""
        with engine.connect() as connection:
            result = connection.execute(
                text(
                    """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name
                """
                )
            )
            tables = {row[0] for row in result}

        expected_tables = {
            "PricingVersions",
            "SKUDefinitions",
            "SaaSProducts",
            "TravelZones",
            "alembic_version",
        }
        assert expected_tables.issubset(tables), f"Missing tables: {expected_tables - tables}"

    def test_pricing_versions_schema(self, engine):
        """Test PricingVersions table has correct PascalCase columns."""
        with engine.connect() as connection:
            result = connection.execute(
                text(
                    """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'PricingVersions'
                ORDER BY ordinal_position
                """
                )
            )
            columns = [row[0] for row in result]

        expected_columns = [
            "Id",
            "VersionNumber",
            "Description",
            "EffectiveDate",
            "ExpirationDate",
            "CreatedBy",
            "CreatedAt",
            "IsCurrent",
            "IsLocked",
        ]
        assert columns == expected_columns, f"Column mismatch: {columns}"


class TestPricingVersionModel:
    """Test PricingVersion model CRUD operations."""

    def test_create_pricing_version(self, db_session: Session):
        """Test creating a new pricing version."""
        version = PricingVersion(
            VersionNumber="2025.INTEGRATION",
            Description="Initial 2025 pricing",
            EffectiveDate=date(2025, 1, 1),
            ExpirationDate=None,
            CreatedBy="admin",
            IsCurrent=True,
            IsLocked=False,
        )
        db_session.add(version)
        db_session.commit()
        db_session.refresh(version)

        assert version.Id is not None
        assert version.VersionNumber == "2025.INTEGRATION"
        assert version.IsCurrent is True
        assert version.CreatedAt is not None

    def test_read_pricing_version(
        self, db_session: Session, sample_pricing_version: PricingVersion
    ):
        """Test reading a pricing version from database."""
        version = db_session.query(PricingVersion).filter_by(Id=sample_pricing_version.Id).first()

        assert version is not None
        assert version.VersionNumber == "2025.TEST"
        assert version.IsCurrent is True

    def test_update_pricing_version(
        self, db_session: Session, sample_pricing_version: PricingVersion
    ):
        """Test updating a pricing version."""
        sample_pricing_version.IsCurrent = False
        sample_pricing_version.ExpirationDate = date(2025, 12, 31)
        db_session.commit()

        version = db_session.query(PricingVersion).filter_by(Id=sample_pricing_version.Id).first()
        assert version.IsCurrent is False
        assert version.ExpirationDate == date(2025, 12, 31)

    def test_unique_version_number(
        self, db_session: Session, sample_pricing_version: PricingVersion
    ):
        """Test that version numbers must be unique."""
        duplicate = PricingVersion(
            VersionNumber="2025.TEST",  # Same as sample_pricing_version
            Description="Duplicate",
            EffectiveDate=date(2025, 1, 1),
            CreatedBy="test_user",
        )
        db_session.add(duplicate)

        with pytest.raises(IntegrityError):
            db_session.commit()


class TestSKUDefinitionModel:
    """Test SKUDefinition model CRUD operations."""

    def test_create_sku_definition(
        self, db_session: Session, sample_pricing_version: PricingVersion
    ):
        """Test creating a new SKU definition."""
        sku = SKUDefinition(
            PricingVersionId=sample_pricing_version.Id,
            SKUCode="TT-100",
            Name="Teller Terminal 100",
            Description="Basic teller terminal",
            Category="Hardware",
            FixedPrice=Decimal("1500.00"),
            RequiresQuantity=True,
            RequiresTravelZone=False,
            RequiresConfiguration=False,
            IsActive=True,
            SortOrder=1,
        )
        db_session.add(sku)
        db_session.commit()
        db_session.refresh(sku)

        assert sku.Id is not None
        assert sku.SKUCode == "TT-100"
        assert sku.FixedPrice == Decimal("1500.00")
        assert sku.CreatedAt is not None

    def test_sku_foreign_key_constraint(self, db_session: Session):
        """Test that SKU requires valid PricingVersionId."""
        from uuid import uuid4

        sku = SKUDefinition(
            PricingVersionId=uuid4(),  # Non-existent pricing version
            SKUCode="INVALID",
            Name="Invalid SKU",
            Category="Hardware",
        )
        db_session.add(sku)

        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_read_sku_with_indexes(
        self, db_session: Session, sample_pricing_version: PricingVersion
    ):
        """Test reading SKUs using indexed columns."""
        # Create multiple SKUs
        skus = [
            SKUDefinition(
                PricingVersionId=sample_pricing_version.Id,
                SKUCode=f"TT-{i}",
                Name=f"Terminal {i}",
                Category="Hardware" if i % 2 == 0 else "Service",
            )
            for i in range(100, 105)
        ]
        db_session.add_all(skus)
        db_session.commit()

        # Query by SKUCode (indexed)
        sku = db_session.query(SKUDefinition).filter_by(SKUCode="TT-102").first()
        assert sku is not None
        assert sku.Name == "Terminal 102"

        # Query by Category (indexed)
        hardware_skus = db_session.query(SKUDefinition).filter_by(Category="Hardware").all()
        assert len(hardware_skus) >= 3


class TestSaaSProductModel:
    """Test SaaSProduct model CRUD operations."""

    def test_create_saas_product(self, db_session: Session, sample_pricing_version: PricingVersion):
        """Test creating a SaaS product with tiered pricing."""
        product = SaaSProduct(
            PricingVersionId=sample_pricing_version.Id,
            ProductCode="SAAS-001",
            Name="Core Banking Platform",
            Description="Essential banking features",
            Category="Core",
            PricingModel="Tiered",
            Tier1Min=0,
            Tier1Max=50,
            Tier1Price=Decimal("45.00"),
            Tier2Min=51,
            Tier2Max=200,
            Tier2Price=Decimal("40.00"),
            Tier3Min=201,
            Tier3Max=None,  # Unlimited
            Tier3Price=Decimal("35.00"),
            IsActive=True,
            IsRequired=True,
            SortOrder=1,
        )
        db_session.add(product)
        db_session.commit()
        db_session.refresh(product)

        assert product.Id is not None
        assert product.ProductCode == "SAAS-001"
        assert product.Tier1Price == Decimal("45.00")
        assert product.Tier3Max is None

    def test_saas_tiered_pricing_structure(
        self, db_session: Session, sample_pricing_version: PricingVersion
    ):
        """Test that SaaS product can handle complex tiered pricing."""
        product = SaaSProduct(
            PricingVersionId=sample_pricing_version.Id,
            ProductCode="SAAS-002",
            Name="Advanced Analytics",
            Category="Optional",
            PricingModel="Tiered",
            Tier1Min=0,
            Tier1Max=100,
            Tier1Price=Decimal("15.00"),
            Tier2Min=101,
            Tier2Max=500,
            Tier2Price=Decimal("12.00"),
            Tier3Min=501,
            Tier3Max=None,
            Tier3Price=Decimal("10.00"),
        )
        db_session.add(product)
        db_session.commit()
        db_session.refresh(product)

        # Verify all tiers are stored correctly
        assert product.Tier1Min == 0
        assert product.Tier1Max == 100
        assert product.Tier2Min == 101
        assert product.Tier3Max is None


class TestTravelZoneModel:
    """Test TravelZone model CRUD operations."""

    def test_create_travel_zone(self, db_session: Session, sample_pricing_version: PricingVersion):
        """Test creating a travel zone."""
        zone = TravelZone(
            PricingVersionId=sample_pricing_version.Id,
            ZoneCode="ZONE-1",
            Name="United States",
            Description="US, Canada, Caribbean",
            MileageRate=Decimal("0.67"),
            DailyRate=Decimal("200.00"),
            HourlyRate=Decimal("150.00"),
            OnsiteDaysIncluded=2,
            IsActive=True,
            SortOrder=1,
        )
        db_session.add(zone)
        db_session.commit()
        db_session.refresh(zone)

        assert zone.Id is not None
        assert zone.ZoneCode == "ZONE-1"
        assert zone.MileageRate == Decimal("0.67")
        assert zone.OnsiteDaysIncluded == 2

    def test_multiple_travel_zones(
        self, db_session: Session, sample_pricing_version: PricingVersion
    ):
        """Test creating multiple travel zones."""
        zones = [
            TravelZone(
                PricingVersionId=sample_pricing_version.Id,
                ZoneCode=f"ZONE-{i}",
                Name=f"Zone {i}",
                MileageRate=Decimal(f"{i}.50"),
                DailyRate=Decimal(f"{i}00.00"),
                HourlyRate=Decimal(f"{i}50.00"),
                OnsiteDaysIncluded=i,
                SortOrder=i,
            )
            for i in range(1, 6)
        ]
        db_session.add_all(zones)
        db_session.commit()

        # Query all zones
        all_zones = db_session.query(TravelZone).order_by(TravelZone.SortOrder).all()
        assert len(all_zones) == 5
        assert all_zones[0].ZoneCode == "ZONE-1"
        assert all_zones[4].ZoneCode == "ZONE-5"


class TestModelRelationships:
    """Test relationships between models."""

    def test_pricing_version_with_all_children(
        self, db_session: Session, sample_pricing_version: PricingVersion
    ):
        """Test creating a complete pricing version with all child records."""
        # Create SKUs
        sku = SKUDefinition(
            PricingVersionId=sample_pricing_version.Id,
            SKUCode="TT-200",
            Name="Teller Terminal 200",
            Category="Hardware",
        )

        # Create SaaS products
        saas = SaaSProduct(
            PricingVersionId=sample_pricing_version.Id,
            ProductCode="SAAS-003",
            Name="Mobile Banking",
            Category="Optional",
            PricingModel="Tiered",
            Tier1Min=0,
            Tier1Max=100,
            Tier1Price=Decimal("10.00"),
        )

        # Create travel zones
        travel = TravelZone(
            PricingVersionId=sample_pricing_version.Id,
            ZoneCode="ZONE-2",
            Name="International",
            MileageRate=Decimal("1.50"),
            DailyRate=Decimal("300.00"),
            HourlyRate=Decimal("200.00"),
            OnsiteDaysIncluded=0,
        )

        db_session.add_all([sku, saas, travel])
        db_session.commit()

        # Verify all records exist and are linked to same pricing version
        skus = (
            db_session.query(SKUDefinition)
            .filter_by(PricingVersionId=sample_pricing_version.Id)
            .all()
        )
        saas_products = (
            db_session.query(SaaSProduct)
            .filter_by(PricingVersionId=sample_pricing_version.Id)
            .all()
        )
        zones = (
            db_session.query(TravelZone).filter_by(PricingVersionId=sample_pricing_version.Id).all()
        )

        assert len(skus) >= 1
        assert len(saas_products) >= 1
        assert len(zones) >= 1

    def test_cascade_restrictions(
        self, db_session: Session, sample_pricing_version: PricingVersion
    ):
        """Test that foreign key constraints use RESTRICT (prevent deletion)."""
        # Create a child record
        sku = SKUDefinition(
            PricingVersionId=sample_pricing_version.Id,
            SKUCode="TT-300",
            Name="Test SKU",
            Category="Hardware",
        )
        db_session.add(sku)
        db_session.commit()

        # Try to delete the pricing version (should fail due to RESTRICT)
        db_session.delete(sample_pricing_version)

        with pytest.raises(IntegrityError):
            db_session.commit()
