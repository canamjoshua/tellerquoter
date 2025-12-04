"""Unit tests for quote calculation logic."""

from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.api.quote import calculate_saas_price, generate_quote_number
from app.core.config import settings
from app.models import PricingVersion, Quote, SaaSProduct


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
    """Clean quotes before each test."""
    db_session.query(Quote).delete()
    db_session.commit()
    yield


# Quote Number Generation Tests


def test_generate_quote_number_first_of_year(db_session: Session, clean_db) -> None:
    """Test generating the first quote number of the year."""
    quote_number = generate_quote_number(db_session)

    # Should be Q-YYYY-0001
    from datetime import datetime

    year = datetime.now().year
    assert quote_number == f"Q-{year}-0001"


def test_generate_quote_number_increments(db_session: Session, clean_db) -> None:
    """Test that quote numbers increment sequentially."""
    from datetime import datetime

    year = datetime.now().year

    # Create first quote
    quote1 = Quote(
        QuoteNumber=f"Q-{year}-0001",
        ClientName="Client 1",
        CreatedBy="test@example.com",
    )
    db_session.add(quote1)
    db_session.commit()

    # Generate next quote number
    quote_number = generate_quote_number(db_session)
    assert quote_number == f"Q-{year}-0002"


def test_generate_quote_number_handles_gaps(db_session: Session, clean_db) -> None:
    """Test that quote number generation finds the highest number even with gaps."""
    from datetime import datetime

    year = datetime.now().year

    # Create quotes with a gap (0001, 0005)
    quote1 = Quote(
        QuoteNumber=f"Q-{year}-0001",
        ClientName="Client 1",
        CreatedBy="test@example.com",
    )
    quote5 = Quote(
        QuoteNumber=f"Q-{year}-0005",
        ClientName="Client 5",
        CreatedBy="test@example.com",
    )
    db_session.add_all([quote1, quote5])
    db_session.commit()

    # Should generate 0006 (not 0002)
    quote_number = generate_quote_number(db_session)
    assert quote_number == f"Q-{year}-0006"


def test_generate_quote_number_ignores_other_years(db_session: Session, clean_db) -> None:
    """Test that quote number generation only considers current year."""
    from datetime import datetime

    year = datetime.now().year
    last_year = year - 1

    # Create quote from last year
    old_quote = Quote(
        QuoteNumber=f"Q-{last_year}-9999",
        ClientName="Old Client",
        CreatedBy="test@example.com",
    )
    db_session.add(old_quote)
    db_session.commit()

    # Should still generate 0001 for this year
    quote_number = generate_quote_number(db_session)
    assert quote_number == f"Q-{year}-0001"


def test_generate_quote_number_pads_zeros(db_session: Session, clean_db) -> None:
    """Test that quote numbers are zero-padded to 4 digits."""
    from datetime import datetime

    year = datetime.now().year

    # Create quote with high number
    quote = Quote(
        QuoteNumber=f"Q-{year}-0099",
        ClientName="Client",
        CreatedBy="test@example.com",
    )
    db_session.add(quote)
    db_session.commit()

    # Next should be 0100 (still 4 digits)
    quote_number = generate_quote_number(db_session)
    assert quote_number == f"Q-{year}-0100"
    assert len(quote_number.split("-")[-1]) == 4


# SaaS Price Calculation Tests


def test_calculate_saas_price_tier1_min_boundary(db_session: Session) -> None:
    """Test tier 1 price at minimum boundary."""
    pricing_version = PricingVersion(
        VersionNumber="2025.TEST",
        Description="Test",
        EffectiveDate=date.today(),
        CreatedBy="test@example.com",
        IsCurrent=True,
        IsLocked=False,
    )
    db_session.add(pricing_version)
    db_session.commit()
    db_session.refresh(pricing_version)

    product = SaaSProduct(
        PricingVersionId=pricing_version.Id,
        ProductCode="TEST-001",
        Name="Test Product",
        Category="Test",
        PricingModel="Tiered",
        Tier1Min=0,
        Tier1Max=1000,
        Tier1Price=Decimal("100.00"),
        Tier2Min=1001,
        Tier2Max=5000,
        Tier2Price=Decimal("80.00"),
    )

    # Test at tier 1 minimum (0)
    price = calculate_saas_price(product, Decimal("0"))
    assert price == Decimal("100.00")


def test_calculate_saas_price_tier1_max_boundary(db_session: Session) -> None:
    """Test tier 1 price at maximum boundary."""
    pricing_version = PricingVersion(
        VersionNumber="2025.TEST",
        Description="Test",
        EffectiveDate=date.today(),
        CreatedBy="test@example.com",
        IsCurrent=True,
        IsLocked=False,
    )
    db_session.add(pricing_version)
    db_session.commit()
    db_session.refresh(pricing_version)

    product = SaaSProduct(
        PricingVersionId=pricing_version.Id,
        ProductCode="TEST-001",
        Name="Test Product",
        Category="Test",
        PricingModel="Tiered",
        Tier1Min=0,
        Tier1Max=1000,
        Tier1Price=Decimal("100.00"),
        Tier2Min=1001,
        Tier2Max=5000,
        Tier2Price=Decimal("80.00"),
    )

    # Test at tier 1 maximum (1000)
    price = calculate_saas_price(product, Decimal("1000"))
    assert price == Decimal("100.00")


def test_calculate_saas_price_tier2_min_boundary(db_session: Session) -> None:
    """Test tier 2 price at minimum boundary."""
    pricing_version = PricingVersion(
        VersionNumber="2025.TEST",
        Description="Test",
        EffectiveDate=date.today(),
        CreatedBy="test@example.com",
        IsCurrent=True,
        IsLocked=False,
    )
    db_session.add(pricing_version)
    db_session.commit()
    db_session.refresh(pricing_version)

    product = SaaSProduct(
        PricingVersionId=pricing_version.Id,
        ProductCode="TEST-001",
        Name="Test Product",
        Category="Test",
        PricingModel="Tiered",
        Tier1Min=0,
        Tier1Max=1000,
        Tier1Price=Decimal("100.00"),
        Tier2Min=1001,
        Tier2Max=5000,
        Tier2Price=Decimal("80.00"),
    )

    # Test at tier 2 minimum (1001)
    price = calculate_saas_price(product, Decimal("1001"))
    assert price == Decimal("80.00")


def test_calculate_saas_price_tier2_mid_range(db_session: Session) -> None:
    """Test tier 2 price in middle of range."""
    pricing_version = PricingVersion(
        VersionNumber="2025.TEST",
        Description="Test",
        EffectiveDate=date.today(),
        CreatedBy="test@example.com",
        IsCurrent=True,
        IsLocked=False,
    )
    db_session.add(pricing_version)
    db_session.commit()
    db_session.refresh(pricing_version)

    product = SaaSProduct(
        PricingVersionId=pricing_version.Id,
        ProductCode="TEST-001",
        Name="Test Product",
        Category="Test",
        PricingModel="Tiered",
        Tier1Min=0,
        Tier1Max=1000,
        Tier1Price=Decimal("100.00"),
        Tier2Min=1001,
        Tier2Max=5000,
        Tier2Price=Decimal("80.00"),
    )

    # Test in tier 2 middle (3000)
    price = calculate_saas_price(product, Decimal("3000"))
    assert price == Decimal("80.00")


def test_calculate_saas_price_tier2_max_boundary(db_session: Session) -> None:
    """Test tier 2 price at maximum boundary."""
    pricing_version = PricingVersion(
        VersionNumber="2025.TEST",
        Description="Test",
        EffectiveDate=date.today(),
        CreatedBy="test@example.com",
        IsCurrent=True,
        IsLocked=False,
    )
    db_session.add(pricing_version)
    db_session.commit()
    db_session.refresh(pricing_version)

    product = SaaSProduct(
        PricingVersionId=pricing_version.Id,
        ProductCode="TEST-001",
        Name="Test Product",
        Category="Test",
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

    # Test at tier 2 maximum (5000)
    price = calculate_saas_price(product, Decimal("5000"))
    assert price == Decimal("80.00")


def test_calculate_saas_price_tier3_min_boundary(db_session: Session) -> None:
    """Test tier 3 price at minimum boundary."""
    pricing_version = PricingVersion(
        VersionNumber="2025.TEST",
        Description="Test",
        EffectiveDate=date.today(),
        CreatedBy="test@example.com",
        IsCurrent=True,
        IsLocked=False,
    )
    db_session.add(pricing_version)
    db_session.commit()
    db_session.refresh(pricing_version)

    product = SaaSProduct(
        PricingVersionId=pricing_version.Id,
        ProductCode="TEST-001",
        Name="Test Product",
        Category="Test",
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

    # Test at tier 3 minimum (5001)
    price = calculate_saas_price(product, Decimal("5001"))
    assert price == Decimal("60.00")


def test_calculate_saas_price_tier3_unbounded(db_session: Session) -> None:
    """Test tier 3 price with no maximum (unbounded)."""
    pricing_version = PricingVersion(
        VersionNumber="2025.TEST",
        Description="Test",
        EffectiveDate=date.today(),
        CreatedBy="test@example.com",
        IsCurrent=True,
        IsLocked=False,
    )
    db_session.add(pricing_version)
    db_session.commit()
    db_session.refresh(pricing_version)

    product = SaaSProduct(
        PricingVersionId=pricing_version.Id,
        ProductCode="TEST-001",
        Name="Test Product",
        Category="Test",
        PricingModel="Tiered",
        Tier1Min=0,
        Tier1Max=1000,
        Tier1Price=Decimal("100.00"),
        Tier2Min=1001,
        Tier2Max=5000,
        Tier2Price=Decimal("80.00"),
        Tier3Min=5001,
        Tier3Max=None,  # Unbounded
        Tier3Price=Decimal("60.00"),
    )

    # Test very large quantity (should still be tier 3)
    price = calculate_saas_price(product, Decimal("1000000"))
    assert price == Decimal("60.00")


def test_calculate_saas_price_single_tier(db_session: Session) -> None:
    """Test product with only one tier."""
    pricing_version = PricingVersion(
        VersionNumber="2025.TEST",
        Description="Test",
        EffectiveDate=date.today(),
        CreatedBy="test@example.com",
        IsCurrent=True,
        IsLocked=False,
    )
    db_session.add(pricing_version)
    db_session.commit()
    db_session.refresh(pricing_version)

    product = SaaSProduct(
        PricingVersionId=pricing_version.Id,
        ProductCode="FLAT-001",
        Name="Flat Rate Product",
        Category="Test",
        PricingModel="Flat",
        Tier1Min=0,
        Tier1Max=999999,
        Tier1Price=Decimal("500.00"),
        Tier2Min=None,
        Tier2Max=None,
        Tier2Price=None,
        Tier3Min=None,
        Tier3Max=None,
        Tier3Price=None,
    )

    # Any quantity should return tier 1 price
    price = calculate_saas_price(product, Decimal("1"))
    assert price == Decimal("500.00")

    price = calculate_saas_price(product, Decimal("10000"))
    assert price == Decimal("500.00")


def test_calculate_saas_price_defaults_to_tier1(db_session: Session) -> None:
    """Test that calculation defaults to tier 1 if no match found."""
    pricing_version = PricingVersion(
        VersionNumber="2025.TEST",
        Description="Test",
        EffectiveDate=date.today(),
        CreatedBy="test@example.com",
        IsCurrent=True,
        IsLocked=False,
    )
    db_session.add(pricing_version)
    db_session.commit()
    db_session.refresh(pricing_version)

    # Create product with gaps in tiers
    product = SaaSProduct(
        PricingVersionId=pricing_version.Id,
        ProductCode="TEST-001",
        Name="Test Product",
        Category="Test",
        PricingModel="Tiered",
        Tier1Min=100,  # Starts at 100 (not 0)
        Tier1Max=1000,
        Tier1Price=Decimal("100.00"),
        Tier2Min=None,
        Tier2Max=None,
        Tier2Price=None,
    )

    # Quantity below tier 1 min should still return tier 1 price
    price = calculate_saas_price(product, Decimal("50"))
    assert price == Decimal("100.00")


def test_calculate_saas_price_zero_price(db_session: Session) -> None:
    """Test handling of zero price."""
    pricing_version = PricingVersion(
        VersionNumber="2025.TEST",
        Description="Test",
        EffectiveDate=date.today(),
        CreatedBy="test@example.com",
        IsCurrent=True,
        IsLocked=False,
    )
    db_session.add(pricing_version)
    db_session.commit()
    db_session.refresh(pricing_version)

    product = SaaSProduct(
        PricingVersionId=pricing_version.Id,
        ProductCode="FREE-001",
        Name="Free Tier Product",
        Category="Test",
        PricingModel="Flat",
        Tier1Min=0,
        Tier1Max=100,
        Tier1Price=Decimal("0.00"),  # Free tier
        Tier2Min=101,
        Tier2Max=999999,
        Tier2Price=Decimal("50.00"),
    )

    # Should return 0.00 for tier 1
    price = calculate_saas_price(product, Decimal("50"))
    assert price == Decimal("0.00")
