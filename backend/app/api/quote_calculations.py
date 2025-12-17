"""API endpoints for quote calculations.

These endpoints expose the calculation logic for frontend consumption
including complexity factor, discounts, travel costs, and projections.
"""

from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.services.quote_calculation_service import QuoteCalculationService

router = APIRouter(prefix="/quote-calculations", tags=["quote-calculations"])


# Request/Response Models


class ComplexityFactorRequest(BaseModel):
    """Request for complexity factor calculation."""

    departments: int = Field(1, ge=1, description="Number of departments")
    revenue_templates: int = Field(0, ge=0, description="Number of revenue submission templates")
    payment_imports: int = Field(0, ge=0, description="Number of payment import integrations")


class ComplexityFactorResponse(BaseModel):
    """Response for complexity factor calculation."""

    complexity_score: float
    tier: str
    tier_name: str
    base_price: float
    estimated_hours: int
    sku_code: str
    additional_dept_count: int
    additional_dept_price: float
    total_org_setup_price: float


class DiscountRequest(BaseModel):
    """Request for discount calculation."""

    saas_monthly: float = Field(..., ge=0, description="Monthly SaaS cost before discounts")
    setup_total: float = Field(..., ge=0, description="Total setup cost before discounts")
    discount_config: dict[str, Any] | None = Field(
        None,
        description="Discount configuration with saas_year1_pct, saas_all_years_pct, setup_fixed, setup_pct",
    )


class DiscountResponse(BaseModel):
    """Response for discount calculation."""

    saas_monthly_before: float
    saas_monthly_after: float
    saas_year1_discount_amount: float
    saas_all_years_discount_pct: float
    setup_before: float
    setup_after: float
    setup_discount_amount: float
    total_discount_year1: float


class TripConfig(BaseModel):
    """Configuration for a single trip."""

    days: int = Field(..., ge=1, description="Number of on-site days")
    people: int = Field(..., ge=1, description="Number of travelers")


class TravelCostRequest(BaseModel):
    """Request for travel cost calculation."""

    travel_zone_id: str | None = Field(None, description="UUID of selected travel zone")
    trips: list[TripConfig] | None = Field(None, description="List of trip configurations")


class TripCostDetail(BaseModel):
    """Cost breakdown for a single trip."""

    days: int
    nights: int
    people: int
    airfare_cost: float
    hotel_cost: float
    per_diem_cost: float
    vehicle_cost: float
    trip_total: float


class TravelCostResponse(BaseModel):
    """Response for travel cost calculation."""

    zone_name: str | None
    trips: list[TripCostDetail]
    total_travel_cost: float


class MultiYearProjectionRequest(BaseModel):
    """Request for multi-year projection calculation."""

    saas_monthly: float = Field(..., ge=0, description="Base monthly SaaS cost")
    setup_total: float = Field(..., ge=0, description="Total setup cost")
    projection_years: int = Field(5, ge=1, le=10, description="Number of years to project")
    escalation_model: str = Field("STANDARD_4PCT", description="Escalation model")
    level_loading_enabled: bool = Field(False, description="Whether to level-load SaaS")
    teller_payments_enabled: bool = Field(
        False, description="Whether Teller Payments discount applies"
    )
    discount_config: dict[str, Any] | None = Field(None, description="Discount configuration")


class YearProjection(BaseModel):
    """Projection data for a single year."""

    year: int
    saas_monthly: float
    saas_annual: float
    setup: float
    travel: float
    total: float
    saas_annual_level_loaded: float | None = None
    saas_monthly_level_loaded: float | None = None


class MultiYearProjectionResponse(BaseModel):
    """Response for multi-year projection calculation."""

    years: list[YearProjection]
    total_contract_value: float
    escalation_model: str
    level_loading_enabled: bool
    teller_payments_discount_applied: bool


class ReferralCommissionRequest(BaseModel):
    """Request for referral commission calculation."""

    setup_total: float = Field(..., ge=0, description="Total setup cost after discounts")
    referral_rate: float | None = Field(None, ge=0, le=100, description="Referral rate percentage")


class ReferralCommissionResponse(BaseModel):
    """Response for referral commission calculation."""

    referral_rate: float
    commission_amount: float


# Endpoints


@router.post("/complexity-factor", response_model=ComplexityFactorResponse)
def calculate_complexity_factor(
    request: ComplexityFactorRequest,
    db: Session = Depends(get_db),
) -> ComplexityFactorResponse:
    """Calculate Organization Setup complexity factor.

    The complexity factor is calculated using the formula configured in the
    COMPLEXITY_FACTOR pricing rule. The default formula is:

    Complexity = Departments + (Revenue_Templates / 4) + Payment_Imports

    Tier thresholds (configurable via PricingRules):
    - 0-10:  Basic ($64,400)
    - 11-20: Medium ($98,440)
    - 21+:   Large ($176,640)
    """
    service = QuoteCalculationService(db)

    # Pass parameters as dict for dynamic formula evaluation
    parameters = {
        "departments": request.departments,
        "revenue_templates": request.revenue_templates,
        "payment_imports": request.payment_imports,
    }
    result = service.calculate_complexity_factor(parameters)

    return ComplexityFactorResponse(
        complexity_score=result["complexity_score"],
        tier=result["tier"],
        tier_name=result["tier_name"],
        base_price=float(result["base_price"]),
        estimated_hours=result["estimated_hours"],
        sku_code=result["sku_code"],
        additional_dept_count=result["additional_dept_count"],
        additional_dept_price=float(result["additional_dept_price"]),
        total_org_setup_price=float(result["total_org_setup_price"]),
    )


@router.post("/discounts", response_model=DiscountResponse)
def calculate_discounts(
    request: DiscountRequest,
    db: Session = Depends(get_db),
) -> DiscountResponse:
    """Calculate discount impacts on quote totals.

    Supports four discount types:
    - saas_year1_pct: Year 1 only SaaS discount
    - saas_all_years_pct: All years SaaS discount
    - setup_fixed: Fixed dollar amount off setup
    - setup_pct: Percentage off setup
    """
    service = QuoteCalculationService(db)
    result = service.apply_discounts(
        saas_monthly=Decimal(str(request.saas_monthly)),
        setup_total=Decimal(str(request.setup_total)),
        discount_config=request.discount_config,
    )

    return DiscountResponse(
        saas_monthly_before=float(result["saas_monthly_before"]),
        saas_monthly_after=float(result["saas_monthly_after"]),
        saas_year1_discount_amount=float(result["saas_year1_discount_amount"]),
        saas_all_years_discount_pct=result["saas_all_years_discount_pct"],
        setup_before=float(result["setup_before"]),
        setup_after=float(result["setup_after"]),
        setup_discount_amount=float(result["setup_discount_amount"]),
        total_discount_year1=float(result["total_discount_year1"]),
    )


@router.post("/travel-cost", response_model=TravelCostResponse)
def calculate_travel_cost(
    request: TravelCostRequest,
    db: Session = Depends(get_db),
) -> TravelCostResponse:
    """Calculate travel costs for a quote.

    Formula: Trip Cost = (Airfare × People) + (Hotel × People × Nights) +
                        (Per Diem × People × Nights) + (Vehicle × Nights)

    Where: Nights = Days + 1 (arrive evening before)
    """
    service = QuoteCalculationService(db)
    trips = [{"days": t.days, "people": t.people} for t in (request.trips or [])]
    result = service.calculate_travel_cost(
        travel_zone_id=request.travel_zone_id,
        trips=trips,
    )

    trip_details = [
        TripCostDetail(
            days=t["days"],
            nights=t["nights"],
            people=t["people"],
            airfare_cost=float(t["airfare_cost"]),
            hotel_cost=float(t["hotel_cost"]),
            per_diem_cost=float(t["per_diem_cost"]),
            vehicle_cost=float(t["vehicle_cost"]),
            trip_total=float(t["trip_total"]),
        )
        for t in result["trips"]
    ]

    return TravelCostResponse(
        zone_name=result["zone_name"],
        trips=trip_details,
        total_travel_cost=float(result["total_travel_cost"]),
    )


@router.post("/multi-year-projection", response_model=MultiYearProjectionResponse)
def calculate_multi_year_projection(
    request: MultiYearProjectionRequest,
    db: Session = Depends(get_db),
) -> MultiYearProjectionResponse:
    """Calculate multi-year SaaS projections.

    Supports:
    - Standard 4% annual escalation
    - Level loading option
    - Teller Payments 10% discount
    """
    service = QuoteCalculationService(db)
    result = service.calculate_multi_year_projection(
        saas_monthly=Decimal(str(request.saas_monthly)),
        setup_total=Decimal(str(request.setup_total)),
        projection_years=request.projection_years,
        escalation_model=request.escalation_model,
        level_loading_enabled=request.level_loading_enabled,
        teller_payments_enabled=request.teller_payments_enabled,
        discount_config=request.discount_config,
    )

    years = [
        YearProjection(
            year=y["year"],
            saas_monthly=float(y["saas_monthly"]),
            saas_annual=float(y["saas_annual"]),
            setup=float(y["setup"]),
            travel=float(y["travel"]),
            total=float(y["total"]),
            saas_annual_level_loaded=(
                float(y["saas_annual_level_loaded"]) if "saas_annual_level_loaded" in y else None
            ),
            saas_monthly_level_loaded=(
                float(y["saas_monthly_level_loaded"]) if "saas_monthly_level_loaded" in y else None
            ),
        )
        for y in result["years"]
    ]

    return MultiYearProjectionResponse(
        years=years,
        total_contract_value=float(result["total_contract_value"]),
        escalation_model=result["escalation_model"],
        level_loading_enabled=result["level_loading_enabled"],
        teller_payments_discount_applied=result["teller_payments_discount_applied"],
    )


@router.post("/referral-commission", response_model=ReferralCommissionResponse)
def calculate_referral_commission(
    request: ReferralCommissionRequest,
    db: Session = Depends(get_db),
) -> ReferralCommissionResponse:
    """Calculate referral commission for internal tracking.

    Commission is calculated as a percentage of setup cost.
    """
    service = QuoteCalculationService(db)
    result = service.calculate_referral_commission(
        setup_total=Decimal(str(request.setup_total)),
        referral_rate=Decimal(str(request.referral_rate)) if request.referral_rate else None,
    )

    return ReferralCommissionResponse(
        referral_rate=float(result["referral_rate"]),
        commission_amount=float(result["commission_amount"]),
    )
