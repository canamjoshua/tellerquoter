"""Unit tests for QuoteCalculationService.

These tests verify the configuration-driven calculation logic including:
- Complexity Factor calculation with configurable formulas
- Discount application logic
- Travel cost calculations
- Multi-year projections with escalation
- Referral commission calculations

IMPORTANT: These tests are completely database-independent. They use mocked
configuration data to test the calculation logic in isolation. This ensures
tests don't break due to database schema changes or seed data modifications.
"""

from decimal import Decimal
from unittest.mock import MagicMock

import pytest

from app.services.quote_calculation_service import QuoteCalculationService

# =============================================================================
# TEST CONFIGURATION DATA
# =============================================================================

COMPLEXITY_FACTOR_CONFIG = {
    "formula": {
        "type": "weighted_sum",
        "components": [
            {"parameter": "departments", "weight": 1.0},
            {"parameter": "revenue_templates", "weight": 0.25},
            {"parameter": "payment_imports", "weight": 1.0},
        ],
    },
    "tiers": [
        {
            "code": "BASIC",
            "name": "Basic",
            "min_score": 0,
            "max_score": 10,
            "sku_code": "ORG-SETUP-BASIC",
            "base_price": 64400.00,
            "estimated_hours": 280,
        },
        {
            "code": "MEDIUM",
            "name": "Medium",
            "min_score": 11,
            "max_score": 20,
            "sku_code": "ORG-SETUP-MEDIUM",
            "base_price": 98440.00,
            "estimated_hours": 428,
        },
        {
            "code": "LARGE",
            "name": "Large",
            "min_score": 21,
            "max_score": None,
            "sku_code": "ORG-SETUP-LARGE",
            "base_price": 176640.00,
            "estimated_hours": 768,
        },
    ],
    "additional_items": {
        "source_parameter": "departments",
        "first_included": 1,
        "sku_code": "ORG-SETUP-ADDITIONAL-DEPT",
        "price_per_item": 4140.00,
        "hours_per_item": 18,
    },
}


def create_mock_travel_zone(
    zone_id: str = "test-zone-id",
    name: str = "Western US",
    airfare: Decimal = Decimal("750.00"),
    hotel: Decimal = Decimal("180.00"),
    per_diem: Decimal = Decimal("60.00"),
    vehicle: Decimal = Decimal("125.00"),
) -> MagicMock:
    """Create a mock TravelZone object for testing."""
    zone = MagicMock()
    zone.Id = zone_id
    zone.Name = name
    zone.AirfareEstimate = airfare
    zone.HotelRate = hotel
    zone.PerDiemRate = per_diem
    zone.VehicleRate = vehicle
    return zone


# =============================================================================
# FIXTURES
# =============================================================================


@pytest.fixture
def mock_db_session() -> MagicMock:
    """Create a mock database session."""
    return MagicMock()


@pytest.fixture
def service_with_complexity_rule(mock_db_session: MagicMock) -> QuoteCalculationService:
    """Create a service with mocked COMPLEXITY_FACTOR rule."""
    service = QuoteCalculationService(mock_db_session)
    # Pre-populate the rules cache
    service._rules_cache["COMPLEXITY_FACTOR"] = COMPLEXITY_FACTOR_CONFIG
    return service


@pytest.fixture
def service_without_rules(mock_db_session: MagicMock) -> QuoteCalculationService:
    """Create a service with no configured rules."""
    service = QuoteCalculationService(mock_db_session)
    # Mock _get_rule to return None (simulating missing rule)
    service._get_rule = MagicMock(return_value=None)
    return service


@pytest.fixture
def service_with_travel_zone(
    mock_db_session: MagicMock,
) -> tuple[QuoteCalculationService, MagicMock]:
    """Create a service with a mocked travel zone query."""
    zone = create_mock_travel_zone()

    # Mock the db query chain
    mock_query = MagicMock()
    mock_query.filter.return_value.first.return_value = zone
    mock_db_session.query.return_value = mock_query

    service = QuoteCalculationService(mock_db_session)
    return service, zone


# =============================================================================
# COMPLEXITY FACTOR CALCULATION TESTS
# =============================================================================


class TestComplexityFactorCalculation:
    """Tests for complexity factor calculation."""

    def test_basic_tier_minimum(
        self, service_with_complexity_rule: QuoteCalculationService
    ) -> None:
        """Test complexity factor at Basic tier minimum (score = 1)."""
        result = service_with_complexity_rule.calculate_complexity_factor(
            {"departments": 1, "revenue_templates": 0, "payment_imports": 0}
        )

        # Score: 1 + 0 + 0 = 1
        assert result["complexity_score"] == 1.0
        assert result["tier"] == "BASIC"
        assert result["tier_name"] == "Basic"
        assert result["base_price"] == Decimal("64400.00")
        assert result["sku_code"] == "ORG-SETUP-BASIC"
        assert result["additional_dept_count"] == 0
        assert result["additional_dept_price"] == Decimal("0")

    def test_basic_tier_maximum(
        self, service_with_complexity_rule: QuoteCalculationService
    ) -> None:
        """Test complexity factor at Basic tier maximum (score = 10)."""
        # Score: 5 + (8 * 0.25) + 3 = 5 + 2 + 3 = 10
        result = service_with_complexity_rule.calculate_complexity_factor(
            {"departments": 5, "revenue_templates": 8, "payment_imports": 3}
        )

        assert result["complexity_score"] == 10.0
        assert result["tier"] == "BASIC"
        assert result["base_price"] == Decimal("64400.00")
        # Additional depts: 5 - 1 = 4
        assert result["additional_dept_count"] == 4
        assert result["additional_dept_price"] == Decimal("16560.00")

    def test_medium_tier_minimum(
        self, service_with_complexity_rule: QuoteCalculationService
    ) -> None:
        """Test complexity factor at Medium tier minimum (score = 11)."""
        # Score: 6 + (8 * 0.25) + 3 = 6 + 2 + 3 = 11
        result = service_with_complexity_rule.calculate_complexity_factor(
            {"departments": 6, "revenue_templates": 8, "payment_imports": 3}
        )

        assert result["complexity_score"] == 11.0
        assert result["tier"] == "MEDIUM"
        assert result["tier_name"] == "Medium"
        assert result["base_price"] == Decimal("98440.00")
        assert result["sku_code"] == "ORG-SETUP-MEDIUM"

    def test_medium_tier_maximum(
        self, service_with_complexity_rule: QuoteCalculationService
    ) -> None:
        """Test complexity factor at Medium tier maximum (score = 20)."""
        # Score: 10 + (16 * 0.25) + 6 = 10 + 4 + 6 = 20
        result = service_with_complexity_rule.calculate_complexity_factor(
            {"departments": 10, "revenue_templates": 16, "payment_imports": 6}
        )

        assert result["complexity_score"] == 20.0
        assert result["tier"] == "MEDIUM"

    def test_large_tier_minimum(
        self, service_with_complexity_rule: QuoteCalculationService
    ) -> None:
        """Test complexity factor at Large tier minimum (score = 21)."""
        # Score: 10 + (20 * 0.25) + 6 = 10 + 5 + 6 = 21
        result = service_with_complexity_rule.calculate_complexity_factor(
            {"departments": 10, "revenue_templates": 20, "payment_imports": 6}
        )

        assert result["complexity_score"] == 21.0
        assert result["tier"] == "LARGE"
        assert result["tier_name"] == "Large"
        assert result["base_price"] == Decimal("176640.00")
        assert result["sku_code"] == "ORG-SETUP-LARGE"

    def test_large_tier_unbounded(
        self, service_with_complexity_rule: QuoteCalculationService
    ) -> None:
        """Test complexity factor at Large tier with very high score."""
        # Score: 50 + (100 * 0.25) + 25 = 50 + 25 + 25 = 100
        result = service_with_complexity_rule.calculate_complexity_factor(
            {"departments": 50, "revenue_templates": 100, "payment_imports": 25}
        )

        assert result["complexity_score"] == 100.0
        assert result["tier"] == "LARGE"

    def test_requirements_example_scenario(
        self, service_with_complexity_rule: QuoteCalculationService
    ) -> None:
        """Test the exact scenario from v2.0 requirements.

        7 depts, 15 templates, 4 imports -> Complexity 14.75 -> Medium tier
        """
        result = service_with_complexity_rule.calculate_complexity_factor(
            {"departments": 7, "revenue_templates": 15, "payment_imports": 4}
        )

        # Score: 7 + (15 * 0.25) + 4 = 7 + 3.75 + 4 = 14.75
        assert result["complexity_score"] == 14.75
        assert result["tier"] == "MEDIUM"
        assert result["base_price"] == Decimal("98440.00")
        assert result["estimated_hours"] == 428
        # Additional depts: 7 - 1 = 6 @ $4,140 each = $24,840
        assert result["additional_dept_count"] == 6
        assert result["additional_dept_price"] == Decimal("24840.00")
        assert result["total_org_setup_price"] == Decimal("123280.00")

    def test_additional_departments_calculation(
        self, service_with_complexity_rule: QuoteCalculationService
    ) -> None:
        """Test additional department pricing calculation."""
        # 1 department - no additional (first included)
        result = service_with_complexity_rule.calculate_complexity_factor(
            {"departments": 1, "revenue_templates": 0, "payment_imports": 0}
        )
        assert result["additional_dept_count"] == 0
        assert result["additional_dept_price"] == Decimal("0")

        # 3 departments - 2 additional @ $4,140 = $8,280
        result = service_with_complexity_rule.calculate_complexity_factor(
            {"departments": 3, "revenue_templates": 0, "payment_imports": 0}
        )
        assert result["additional_dept_count"] == 2
        assert result["additional_dept_price"] == Decimal("8280.00")

        # 10 departments - 9 additional @ $4,140 = $37,260
        result = service_with_complexity_rule.calculate_complexity_factor(
            {"departments": 10, "revenue_templates": 0, "payment_imports": 0}
        )
        assert result["additional_dept_count"] == 9
        assert result["additional_dept_price"] == Decimal("37260.00")

    def test_no_rule_configured(self, service_without_rules: QuoteCalculationService) -> None:
        """Test behavior when COMPLEXITY_FACTOR rule is not configured."""
        result = service_without_rules.calculate_complexity_factor(
            {"departments": 5, "revenue_templates": 10, "payment_imports": 3}
        )

        assert result["tier"] == "UNKNOWN"
        assert "error" in result
        assert result["error"] == "COMPLEXITY_FACTOR rule not configured"


# =============================================================================
# DISCOUNT CALCULATION TESTS
# =============================================================================


class TestDiscountCalculation:
    """Tests for discount application logic."""

    def test_no_discounts(self, mock_db_session: MagicMock) -> None:
        """Test with no discounts applied."""
        service = QuoteCalculationService(mock_db_session)
        result = service.apply_discounts(
            saas_monthly=Decimal("2950.00"),
            setup_total=Decimal("100000.00"),
            discount_config=None,
        )

        assert result["saas_monthly_before"] == Decimal("2950.00")
        assert result["saas_monthly_after"] == Decimal("2950.00")
        assert result["saas_year1_discount_amount"] == Decimal("0")
        assert result["setup_before"] == Decimal("100000.00")
        assert result["setup_after"] == Decimal("100000.00")
        assert result["setup_discount_amount"] == Decimal("0")

    def test_saas_year1_discount_only(self, mock_db_session: MagicMock) -> None:
        """Test Year 1 only SaaS discount."""
        service = QuoteCalculationService(mock_db_session)
        result = service.apply_discounts(
            saas_monthly=Decimal("2950.00"),  # $35,400/year
            setup_total=Decimal("100000.00"),
            discount_config={"saas_year1_pct": 10},
        )

        # 10% off Year 1 SaaS: $35,400 * 0.10 = $3,540
        assert result["saas_year1_discount_amount"] == Decimal("3540.00")
        assert result["saas_monthly_after"] == Decimal("2950.00")  # All years monthly unchanged

    def test_saas_all_years_discount_only(self, mock_db_session: MagicMock) -> None:
        """Test all years SaaS discount."""
        service = QuoteCalculationService(mock_db_session)
        result = service.apply_discounts(
            saas_monthly=Decimal("2950.00"),
            setup_total=Decimal("100000.00"),
            discount_config={"saas_all_years_pct": 5},
        )

        # 5% off all years: $2,950 * 0.95 = $2,802.50
        assert result["saas_monthly_after"] == Decimal("2802.50")
        assert result["saas_all_years_discount_pct"] == 5.0

    def test_combined_saas_discounts(self, mock_db_session: MagicMock) -> None:
        """Test Year 1 + all years SaaS discounts combined."""
        service = QuoteCalculationService(mock_db_session)
        result = service.apply_discounts(
            saas_monthly=Decimal("2950.00"),  # $35,400/year
            setup_total=Decimal("100000.00"),
            discount_config={"saas_year1_pct": 10, "saas_all_years_pct": 5},
        )

        # All years: 5% off -> $2,802.50/mo -> $33,630/year
        # Year 1: additional 10% off -> $33,630 * 0.90 = $30,267
        # Total Year 1 discount: $35,400 - $30,267 = $5,133
        assert result["saas_monthly_after"] == Decimal("2802.50")
        assert result["saas_year1_discount_amount"] == Decimal("5133.00")

    def test_setup_fixed_discount(self, mock_db_session: MagicMock) -> None:
        """Test fixed dollar discount on setup."""
        service = QuoteCalculationService(mock_db_session)
        result = service.apply_discounts(
            saas_monthly=Decimal("2950.00"),
            setup_total=Decimal("100000.00"),
            discount_config={"setup_fixed": 5000},
        )

        assert result["setup_after"] == Decimal("95000.00")
        assert result["setup_discount_amount"] == Decimal("5000.00")

    def test_setup_percentage_discount(self, mock_db_session: MagicMock) -> None:
        """Test percentage discount on setup."""
        service = QuoteCalculationService(mock_db_session)
        result = service.apply_discounts(
            saas_monthly=Decimal("2950.00"),
            setup_total=Decimal("100000.00"),
            discount_config={"setup_pct": 10},
        )

        assert result["setup_after"] == Decimal("90000.00")
        assert result["setup_discount_amount"] == Decimal("10000.00")

    def test_combined_setup_discounts(self, mock_db_session: MagicMock) -> None:
        """Test fixed + percentage setup discounts (fixed applied first)."""
        service = QuoteCalculationService(mock_db_session)
        result = service.apply_discounts(
            saas_monthly=Decimal("2950.00"),
            setup_total=Decimal("100000.00"),
            discount_config={"setup_fixed": 5000, "setup_pct": 10},
        )

        # Fixed first: $100,000 - $5,000 = $95,000
        # Then percentage: $95,000 * 0.90 = $85,500
        assert result["setup_after"] == Decimal("85500.00")
        assert result["setup_discount_amount"] == Decimal("14500.00")

    def test_all_discounts_combined(self, mock_db_session: MagicMock) -> None:
        """Test all discount types combined."""
        service = QuoteCalculationService(mock_db_session)
        result = service.apply_discounts(
            saas_monthly=Decimal("2950.00"),
            setup_total=Decimal("123280.00"),  # From complexity test
            discount_config={
                "saas_year1_pct": 10,
                "saas_all_years_pct": 5,
                "setup_fixed": 5000,
                "setup_pct": 10,
            },
        )

        # SaaS: Year 1 discount = $5,133 (calculated above)
        # Setup: ($123,280 - $5,000) * 0.90 = $106,452
        # Setup discount: $123,280 - $106,452 = $16,828
        assert result["setup_after"] == Decimal("106452.00")
        assert result["setup_discount_amount"] == Decimal("16828.00")
        assert result["total_discount_year1"] == Decimal("21961.00")


# =============================================================================
# TRAVEL COST CALCULATION TESTS
# =============================================================================


class TestTravelCostCalculation:
    """Tests for travel cost calculation."""

    def test_no_travel_zone(self, mock_db_session: MagicMock) -> None:
        """Test with no travel zone selected."""
        service = QuoteCalculationService(mock_db_session)
        result = service.calculate_travel_cost(
            travel_zone_id=None, trips=[{"days": 2, "people": 2}]
        )

        assert result["zone_name"] is None
        assert result["trips"] == []
        assert result["total_travel_cost"] == Decimal("0")

    def test_no_trips(self, service_with_travel_zone: tuple) -> None:
        """Test with no trips configured."""
        service, zone = service_with_travel_zone
        result = service.calculate_travel_cost(travel_zone_id="test-zone-id", trips=None)

        assert result["total_travel_cost"] == Decimal("0")

    def test_requirements_example_scenario(self, service_with_travel_zone: tuple) -> None:
        """Test the exact scenario from v2.0 requirements.

        2-day trip, 2 people, Zone 2 (Western US) -> $3,315
        """
        service, zone = service_with_travel_zone

        result = service.calculate_travel_cost(
            travel_zone_id="test-zone-id", trips=[{"days": 2, "people": 2}]
        )

        # Formula: (Airfare x People) + (Hotel x People x Nights) +
        #          (Per Diem x People x Nights) + (Vehicle x Nights)
        # Where Nights = Days + 1 = 3
        # = ($750 x 2) + ($180 x 2 x 3) + ($60 x 2 x 3) + ($125 x 3)
        # = $1,500 + $1,080 + $360 + $375
        # = $3,315
        assert result["zone_name"] == "Western US"
        assert len(result["trips"]) == 1

        trip = result["trips"][0]
        assert trip["days"] == 2
        assert trip["nights"] == 3
        assert trip["people"] == 2
        assert trip["airfare_cost"] == Decimal("1500.00")
        assert trip["hotel_cost"] == Decimal("1080.00")
        assert trip["per_diem_cost"] == Decimal("360.00")
        assert trip["vehicle_cost"] == Decimal("375.00")
        assert trip["trip_total"] == Decimal("3315.00")

        assert result["total_travel_cost"] == Decimal("3315.00")

    def test_local_zone_no_airfare(self, mock_db_session: MagicMock) -> None:
        """Test local zone with zero airfare."""
        # Create a local zone with $0 airfare
        local_zone = create_mock_travel_zone(name="Denver Metro", airfare=Decimal("0.00"))
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = local_zone
        mock_db_session.query.return_value = mock_query

        service = QuoteCalculationService(mock_db_session)
        result = service.calculate_travel_cost(
            travel_zone_id="local-zone-id", trips=[{"days": 2, "people": 2}]
        )

        trip = result["trips"][0]
        assert trip["airfare_cost"] == Decimal("0")
        # Total: $0 + $1,080 + $360 + $375 = $1,815
        assert trip["trip_total"] == Decimal("1815.00")

    def test_multiple_trips(self, service_with_travel_zone: tuple) -> None:
        """Test multiple trips to same zone."""
        service, zone = service_with_travel_zone

        result = service.calculate_travel_cost(
            travel_zone_id="test-zone-id",
            trips=[
                {"days": 2, "people": 2},  # Kickoff: $3,315
                {"days": 3, "people": 1},  # Interface Analysis: different calculation
                {"days": 2, "people": 2},  # Training: $3,315
                {"days": 1, "people": 2},  # Go-Live: different calculation
            ],
        )

        assert len(result["trips"]) == 4

        # Trip 2: 3 days, 1 person, 4 nights
        # = ($750 x 1) + ($180 x 1 x 4) + ($60 x 1 x 4) + ($125 x 4)
        # = $750 + $720 + $240 + $500 = $2,210
        trip2 = result["trips"][1]
        assert trip2["trip_total"] == Decimal("2210.00")

        # Trip 4: 1 day, 2 people, 2 nights
        # = ($750 x 2) + ($180 x 2 x 2) + ($60 x 2 x 2) + ($125 x 2)
        # = $1,500 + $720 + $240 + $250 = $2,710
        trip4 = result["trips"][3]
        assert trip4["trip_total"] == Decimal("2710.00")

        # Total: $3,315 + $2,210 + $3,315 + $2,710 = $11,550
        assert result["total_travel_cost"] == Decimal("11550.00")

    def test_single_person_trip(self, mock_db_session: MagicMock) -> None:
        """Test single person trip calculation."""
        # Create Eastern US zone
        eastern_zone = create_mock_travel_zone(name="Eastern US", airfare=Decimal("950.00"))
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = eastern_zone
        mock_db_session.query.return_value = mock_query

        service = QuoteCalculationService(mock_db_session)
        result = service.calculate_travel_cost(
            travel_zone_id="eastern-zone-id", trips=[{"days": 1, "people": 1}]
        )

        # 1 day, 1 person, 2 nights
        # = ($950 x 1) + ($180 x 1 x 2) + ($60 x 1 x 2) + ($125 x 2)
        # = $950 + $360 + $120 + $250 = $1,680
        trip = result["trips"][0]
        assert trip["trip_total"] == Decimal("1680.00")


# =============================================================================
# MULTI-YEAR PROJECTION TESTS
# =============================================================================


class TestMultiYearProjection:
    """Tests for multi-year SaaS projection calculations."""

    def test_no_escalation(self, mock_db_session: MagicMock) -> None:
        """Test projection with no escalation."""
        service = QuoteCalculationService(mock_db_session)
        result = service.calculate_multi_year_projection(
            saas_monthly=Decimal("2950.00"),
            setup_total=Decimal("100000.00"),
            projection_years=5,
            escalation_model="NONE",
        )

        assert len(result["years"]) == 5

        # All years should have same SaaS
        for year_data in result["years"]:
            assert year_data["saas_monthly"] == Decimal("2950.00")
            assert year_data["saas_annual"] == Decimal("35400.00")

        # Setup only in Year 1
        assert result["years"][0]["setup"] == Decimal("100000.00")
        for year_data in result["years"][1:]:
            assert year_data["setup"] == Decimal("0")

        # Total: $35,400 x 5 + $100,000 = $277,000
        assert result["total_contract_value"] == Decimal("277000.00")

    def test_standard_4_percent_escalation(self, mock_db_session: MagicMock) -> None:
        """Test projection with standard 4% compound escalation."""
        service = QuoteCalculationService(mock_db_session)
        result = service.calculate_multi_year_projection(
            saas_monthly=Decimal("2950.00"),
            setup_total=Decimal("100000.00"),
            projection_years=5,
            escalation_model="STANDARD_4PCT",
        )

        assert result["escalation_model"] == "STANDARD_4PCT"

        # Year 1: $2,950/mo
        assert result["years"][0]["saas_monthly"] == Decimal("2950.00")

        # Year 2: $2,950 x 1.04 = $3,068
        year2_monthly = result["years"][1]["saas_monthly"]
        assert Decimal("3067") < year2_monthly < Decimal("3069")

        # Year 5: $2,950 x 1.04^4 = $3,451.06
        year5_monthly = result["years"][4]["saas_monthly"]
        assert Decimal("3450") < year5_monthly < Decimal("3452")

    def test_teller_payments_discount(self, mock_db_session: MagicMock) -> None:
        """Test 10% Teller Payments discount on SaaS."""
        service = QuoteCalculationService(mock_db_session)
        result = service.calculate_multi_year_projection(
            saas_monthly=Decimal("2950.00"),
            setup_total=Decimal("100000.00"),
            projection_years=5,
            escalation_model="NONE",
            teller_payments_enabled=True,
        )

        assert result["teller_payments_discount_applied"] is True

        # 10% discount: $2,950 x 0.90 = $2,655
        for year_data in result["years"]:
            assert year_data["saas_monthly"] == Decimal("2655.00")

    def test_level_loading(self, mock_db_session: MagicMock) -> None:
        """Test level loading option."""
        service = QuoteCalculationService(mock_db_session)
        result = service.calculate_multi_year_projection(
            saas_monthly=Decimal("2950.00"),
            setup_total=Decimal("100000.00"),
            projection_years=5,
            escalation_model="STANDARD_4PCT",
            level_loading_enabled=True,
        )

        assert result["level_loading_enabled"] is True

        # All years should have same level-loaded annual amount
        level_annual = result["years"][0]["saas_annual_level_loaded"]
        for year_data in result["years"]:
            assert year_data["saas_annual_level_loaded"] == level_annual


# =============================================================================
# REFERRAL COMMISSION TESTS
# =============================================================================


class TestReferralCommission:
    """Tests for referral commission calculation."""

    def test_no_referral(self, mock_db_session: MagicMock) -> None:
        """Test with no referral rate."""
        service = QuoteCalculationService(mock_db_session)
        result = service.calculate_referral_commission(
            setup_total=Decimal("100000.00"), referral_rate=None
        )

        assert result["referral_rate"] == Decimal("0")
        assert result["commission_amount"] == Decimal("0")

    def test_standard_10_percent_referral(self, mock_db_session: MagicMock) -> None:
        """Test standard 10% referral commission."""
        service = QuoteCalculationService(mock_db_session)
        result = service.calculate_referral_commission(
            setup_total=Decimal("100000.00"), referral_rate=Decimal("10")
        )

        assert result["referral_rate"] == Decimal("10")
        assert result["commission_amount"] == Decimal("10000.00")

    def test_custom_referral_rate(self, mock_db_session: MagicMock) -> None:
        """Test custom referral rate."""
        service = QuoteCalculationService(mock_db_session)
        result = service.calculate_referral_commission(
            setup_total=Decimal("123280.00"),  # From complexity test
            referral_rate=Decimal("7.5"),
        )

        # 7.5% of $123,280 = $9,246
        assert result["commission_amount"] == Decimal("9246.00")


# =============================================================================
# FORMULA EVALUATION TESTS
# =============================================================================


class TestFormulaEvaluation:
    """Tests for formula evaluation helper methods."""

    def test_weighted_sum_formula(
        self, service_with_complexity_rule: QuoteCalculationService
    ) -> None:
        """Test weighted sum formula evaluation."""
        # Test various parameter combinations
        test_cases = [
            # (depts, templates, imports, expected_score)
            (1, 0, 0, 1.0),  # 1 + 0 + 0 = 1
            (5, 0, 0, 5.0),  # 5 + 0 + 0 = 5
            (0, 4, 0, 1.0),  # 0 + 1 + 0 = 1
            (0, 8, 0, 2.0),  # 0 + 2 + 0 = 2
            (0, 0, 3, 3.0),  # 0 + 0 + 3 = 3
            (7, 15, 4, 14.75),  # 7 + 3.75 + 4 = 14.75
            (10, 20, 10, 25.0),  # 10 + 5 + 10 = 25
        ]

        for depts, templates, imports, expected in test_cases:
            result = service_with_complexity_rule.calculate_complexity_factor(
                {"departments": depts, "revenue_templates": templates, "payment_imports": imports}
            )
            assert (
                result["complexity_score"] == expected
            ), f"Failed for {depts}, {templates}, {imports}"

    def test_tier_matching(self, service_with_complexity_rule: QuoteCalculationService) -> None:
        """Test tier matching at boundaries."""
        # Test exact boundaries
        tier_tests = [
            (0, "BASIC"),
            (10, "BASIC"),
            (11, "MEDIUM"),
            (20, "MEDIUM"),
            (21, "LARGE"),
            (100, "LARGE"),
        ]

        for score_params, expected_tier in tier_tests:
            # Create params that produce the exact score
            result = service_with_complexity_rule.calculate_complexity_factor(
                {"departments": score_params, "revenue_templates": 0, "payment_imports": 0}
            )
            assert result["tier"] == expected_tier, f"Failed for score {score_params}"


# =============================================================================
# END-TO-END WORKFLOW TESTS
# =============================================================================


class TestEndToEndWorkflow:
    """End-to-end tests combining multiple calculations."""

    def test_full_quote_calculation_workflow(self, mock_db_session: MagicMock) -> None:
        """Test a complete quote calculation workflow.

        This test simulates a real quote scenario using mocked data.
        """
        # Set up travel zone mock
        western_zone = create_mock_travel_zone()
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = western_zone
        mock_db_session.query.return_value = mock_query

        service = QuoteCalculationService(mock_db_session)
        # Pre-populate the rules cache
        service._rules_cache["COMPLEXITY_FACTOR"] = COMPLEXITY_FACTOR_CONFIG

        # Step 1: Calculate complexity factor
        complexity = service.calculate_complexity_factor(
            {"departments": 7, "revenue_templates": 15, "payment_imports": 4}
        )

        assert complexity["complexity_score"] == 14.75
        assert complexity["tier"] == "MEDIUM"
        assert complexity["total_org_setup_price"] == Decimal("123280.00")

        # Step 2: Calculate travel
        travel = service.calculate_travel_cost(
            travel_zone_id="test-zone-id",
            trips=[
                {"days": 2, "people": 2},  # Kickoff
                {"days": 2, "people": 2},  # Interface Analysis
                {"days": 2, "people": 2},  # Training
                {"days": 2, "people": 2},  # Go-Live
            ],
        )

        # 4 trips x $3,315 = $13,260
        assert len(travel["trips"]) == 4
        assert travel["total_travel_cost"] == Decimal("13260.00")

        # Step 3: Apply discounts
        discounts = service.apply_discounts(
            saas_monthly=Decimal("2950.00"),
            setup_total=complexity["total_org_setup_price"],
            discount_config={"saas_year1_pct": 10, "setup_pct": 5},
        )

        # 5% off setup: $123,280 x 0.95 = $117,116
        assert discounts["setup_after"] == Decimal("117116.00")

        # Step 4: Calculate multi-year projection
        projection = service.calculate_multi_year_projection(
            saas_monthly=Decimal("2950.00"),
            setup_total=complexity["total_org_setup_price"],
            projection_years=5,
            escalation_model="STANDARD_4PCT",
            discount_config={"saas_year1_pct": 10, "setup_pct": 5},
        )

        assert len(projection["years"]) == 5
        assert projection["total_contract_value"] > 0

        # Step 5: Calculate referral commission (if applicable)
        referral = service.calculate_referral_commission(
            setup_total=discounts["setup_after"],
            referral_rate=Decimal("10"),
        )

        # 10% of $117,116 = $11,711.60
        assert referral["commission_amount"] == Decimal("11711.60")
