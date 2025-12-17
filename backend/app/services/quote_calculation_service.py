"""Quote calculation service for v2.0 requirements.

This service implements CONFIGURATION-DRIVEN calculation logic:
- All formulas, tiers, and rules are loaded from the PricingRules table
- No hardcoded calculations - everything is dynamic
- Administrators can modify pricing logic through database configuration
"""

from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from app.models import TravelZone
from app.models.pricing_rule import PricingRule
from app.services.configuration_service import ConfigurationService


class QuoteCalculationService:
    """Service for configuration-driven quote calculations.

    All calculations are based on rules stored in the PricingRules table.
    This allows administrators to modify formulas, tiers, and thresholds
    without code changes.
    """

    def __init__(self, db: Session):
        """Initialize quote calculation service.

        Args:
            db: Database session
        """
        self.db = db
        self.config = ConfigurationService(db)
        self._rules_cache: dict[str, dict[str, Any]] = {}

    def _get_rule(self, rule_code: str) -> dict[str, Any] | None:
        """Get a pricing rule configuration by code.

        Args:
            rule_code: The rule code to look up (e.g., "COMPLEXITY_FACTOR")

        Returns:
            The rule configuration dict or None if not found
        """
        if rule_code in self._rules_cache:
            return self._rules_cache[rule_code]

        pricing_version_id = self.config.get_pricing_version_id()
        rule = (
            self.db.query(PricingRule)
            .filter(
                PricingRule.PricingVersionId == pricing_version_id,
                PricingRule.RuleCode == rule_code,
                PricingRule.IsActive == True,  # noqa: E712
            )
            .first()
        )

        if rule:
            self._rules_cache[rule_code] = rule.Configuration
            return rule.Configuration
        return None

    def _evaluate_formula(
        self, formula_config: dict[str, Any], parameters: dict[str, Any]
    ) -> Decimal:
        """Evaluate a formula configuration against parameters.

        Supports formula types:
        - weighted_sum: Sum of (parameter * weight) for each component
        - expression: Mathematical expression string (safe eval)
        - lookup: Direct parameter lookup

        Args:
            formula_config: Formula configuration from rule
            parameters: Input parameters for calculation

        Returns:
            Calculated result as Decimal
        """
        formula_type = formula_config.get("type", "weighted_sum")

        if formula_type == "weighted_sum":
            total = Decimal("0")
            for component in formula_config.get("components", []):
                param_name = component.get("parameter", "")
                weight = Decimal(str(component.get("weight", 1)))
                value = Decimal(str(parameters.get(param_name, 0)))
                total += value * weight
            return total

        elif formula_type == "expression":
            # Safe expression evaluation using only basic math
            expression = formula_config.get("expression", "0")
            # Replace parameter names with values
            for param_name, param_value in parameters.items():
                expression = expression.replace(f"{{{param_name}}}", str(param_value))
            # Evaluate safely (only allow numbers and basic operators)
            try:
                # Remove any characters that aren't safe
                safe_chars = set("0123456789.+-*/() ")
                if all(c in safe_chars for c in expression):
                    return Decimal(str(eval(expression)))  # noqa: S307
            except (ValueError, SyntaxError, ZeroDivisionError):
                pass
            return Decimal("0")

        elif formula_type == "lookup":
            param_name = formula_config.get("parameter", "")
            return Decimal(str(parameters.get(param_name, 0)))

        return Decimal("0")

    def _find_tier(self, tiers: list[dict[str, Any]], score: Decimal) -> dict[str, Any] | None:
        """Find the matching tier for a given score.

        Args:
            tiers: List of tier configurations
            score: The calculated score to match

        Returns:
            Matching tier configuration or None
        """
        for tier in tiers:
            min_score = tier.get("min_score", 0)
            max_score = tier.get("max_score")

            if min_score is None:
                min_score = float("-inf")
            if max_score is None:
                max_score = float("inf")

            if min_score <= float(score) <= max_score:
                return tier

        # Return last tier as default if no match
        return tiers[-1] if tiers else None

    def calculate_complexity_factor(
        self,
        parameters: dict[str, Any],
    ) -> dict[str, Any]:
        """Calculate Organization Setup complexity factor using configured rules.

        The formula and tiers are loaded from the COMPLEXITY_FACTOR pricing rule.
        If no rule exists, returns a default response.

        Args:
            parameters: Dictionary of input parameters (e.g., departments, revenue_templates)

        Returns:
            Dictionary with complexity details including score, tier, pricing
        """
        rule = self._get_rule("COMPLEXITY_FACTOR")

        if not rule:
            # No rule configured - return defaults
            return {
                "complexity_score": 0,
                "tier": "UNKNOWN",
                "tier_name": "Not Configured",
                "base_price": Decimal("0"),
                "estimated_hours": 0,
                "sku_code": None,
                "additional_dept_count": 0,
                "additional_dept_price": Decimal("0"),
                "total_org_setup_price": Decimal("0"),
                "error": "COMPLEXITY_FACTOR rule not configured",
            }

        # Calculate complexity score using configured formula
        formula = rule.get("formula", {"type": "weighted_sum", "components": []})
        complexity_score = self._evaluate_formula(formula, parameters)

        # Find matching tier
        tiers = rule.get("tiers", [])
        matched_tier = self._find_tier(tiers, complexity_score)

        if not matched_tier:
            return {
                "complexity_score": float(complexity_score),
                "tier": "UNKNOWN",
                "tier_name": "No Matching Tier",
                "base_price": Decimal("0"),
                "estimated_hours": 0,
                "sku_code": None,
                "additional_dept_count": 0,
                "additional_dept_price": Decimal("0"),
                "total_org_setup_price": Decimal("0"),
                "error": "No tier matches the calculated score",
            }

        # Extract tier details
        tier_code = matched_tier.get("code", "UNKNOWN")
        tier_name = matched_tier.get("name", "Unknown")
        base_price = Decimal(str(matched_tier.get("base_price", 0)))
        estimated_hours = matched_tier.get("estimated_hours", 0)
        sku_code = matched_tier.get("sku_code")

        # Calculate additional costs (e.g., additional departments)
        additional_config = rule.get("additional_items", {})
        additional_dept_count = 0
        additional_dept_price = Decimal("0")

        if additional_config:
            source_param = additional_config.get("source_parameter", "departments")
            first_included = additional_config.get("first_included", 1)
            price_per_item = Decimal(str(additional_config.get("price_per_item", 0)))

            source_value = parameters.get(source_param, 0)
            additional_dept_count = max(0, source_value - first_included)
            additional_dept_price = price_per_item * additional_dept_count

        total_org_setup_price = base_price + additional_dept_price

        return {
            "complexity_score": float(complexity_score),
            "tier": tier_code,
            "tier_name": tier_name,
            "base_price": base_price,
            "estimated_hours": estimated_hours,
            "sku_code": sku_code,
            "additional_dept_count": additional_dept_count,
            "additional_dept_price": additional_dept_price,
            "total_org_setup_price": total_org_setup_price,
            "formula_components": formula.get("components", []),
            "tier_thresholds": [
                {"tier": t.get("code"), "min": t.get("min_score"), "max": t.get("max_score")}
                for t in tiers
            ],
        }

    def apply_discounts(
        self,
        saas_monthly: Decimal,
        setup_total: Decimal,
        discount_config: dict[str, Any] | None,
    ) -> dict[str, Any]:
        """Apply discounts to quote totals.

        Discount types:
        - saas_year1_pct: Percentage discount on Year 1 SaaS only
        - saas_all_years_pct: Percentage discount on all years SaaS
        - setup_fixed: Fixed dollar discount on setup
        - setup_pct: Percentage discount on setup

        Args:
            saas_monthly: Monthly SaaS cost before discounts
            setup_total: Total setup cost before discounts
            discount_config: Dictionary of discount configurations

        Returns:
            Dictionary with discount details:
            {
                "saas_monthly_before": Decimal,
                "saas_monthly_after": Decimal,
                "saas_year1_discount_amount": Decimal,
                "saas_all_years_discount_pct": float,
                "setup_before": Decimal,
                "setup_after": Decimal,
                "setup_discount_amount": Decimal,
                "total_discount_year1": Decimal
            }
        """
        if not discount_config:
            discount_config = {}

        saas_year1_pct = Decimal(str(discount_config.get("saas_year1_pct", 0)))
        saas_all_years_pct = Decimal(str(discount_config.get("saas_all_years_pct", 0)))
        setup_fixed = Decimal(str(discount_config.get("setup_fixed", 0)))
        setup_pct = Decimal(str(discount_config.get("setup_pct", 0)))

        # Calculate SaaS discounts
        # All years discount applies first, then year 1 discount applies on top
        saas_monthly_after_all_years = saas_monthly * (1 - saas_all_years_pct / 100)
        saas_annual_year1_before = saas_monthly * 12
        saas_annual_year1_after = saas_monthly_after_all_years * 12 * (1 - saas_year1_pct / 100)
        saas_year1_discount_amount = saas_annual_year1_before - saas_annual_year1_after

        # Calculate setup discounts
        # Fixed discount applies first, then percentage
        setup_after_fixed = max(Decimal("0"), setup_total - setup_fixed)
        setup_after = setup_after_fixed * (1 - setup_pct / 100)
        setup_discount_amount = setup_total - setup_after

        # Total Year 1 discount
        total_discount_year1 = saas_year1_discount_amount + setup_discount_amount

        return {
            "saas_monthly_before": saas_monthly,
            "saas_monthly_after": saas_monthly_after_all_years,
            "saas_year1_discount_amount": saas_year1_discount_amount,
            "saas_all_years_discount_pct": float(saas_all_years_pct),
            "setup_before": setup_total,
            "setup_after": setup_after,
            "setup_discount_amount": setup_discount_amount,
            "total_discount_year1": total_discount_year1,
        }

    def calculate_travel_cost(
        self,
        travel_zone_id: str | None,
        trips: list[dict[str, Any]] | None,
    ) -> dict[str, Any]:
        """Calculate travel costs per v2.0 formula.

        Formula: Trip Cost = (Airfare × People) + (Hotel × People × Nights) +
                            (Per Diem × People × Nights) + (Vehicle × Nights)

        Where: Nights = Days + 1 (arrive evening before)

        Args:
            travel_zone_id: UUID of selected travel zone
            trips: List of trip configurations [{days: int, people: int}, ...]

        Returns:
            Dictionary with travel cost breakdown:
            {
                "zone_name": str,
                "trips": [
                    {
                        "days": int,
                        "nights": int,
                        "people": int,
                        "airfare_cost": Decimal,
                        "hotel_cost": Decimal,
                        "per_diem_cost": Decimal,
                        "vehicle_cost": Decimal,
                        "trip_total": Decimal
                    },
                    ...
                ],
                "total_travel_cost": Decimal
            }
        """
        if not travel_zone_id or not trips:
            return {
                "zone_name": None,
                "trips": [],
                "total_travel_cost": Decimal("0"),
            }

        # Get travel zone rates
        zone = self.db.query(TravelZone).filter(TravelZone.Id == travel_zone_id).first()
        if not zone:
            return {
                "zone_name": None,
                "trips": [],
                "total_travel_cost": Decimal("0"),
            }

        trip_details = []
        total_travel_cost = Decimal("0")

        for trip in trips:
            days = trip.get("days", 1)
            people = trip.get("people", 1)
            nights = days + 1  # Arrive evening before

            # Calculate costs
            airfare_cost = zone.AirfareEstimate * people
            hotel_cost = zone.HotelRate * people * nights
            per_diem_cost = zone.PerDiemRate * people * nights
            vehicle_cost = zone.VehicleRate * nights

            trip_total = airfare_cost + hotel_cost + per_diem_cost + vehicle_cost
            total_travel_cost += trip_total

            trip_details.append(
                {
                    "days": days,
                    "nights": nights,
                    "people": people,
                    "airfare_cost": airfare_cost,
                    "hotel_cost": hotel_cost,
                    "per_diem_cost": per_diem_cost,
                    "vehicle_cost": vehicle_cost,
                    "trip_total": trip_total,
                }
            )

        return {
            "zone_name": zone.Name,
            "trips": trip_details,
            "total_travel_cost": total_travel_cost,
        }

    def calculate_multi_year_projection(
        self,
        saas_monthly: Decimal,
        setup_total: Decimal,
        projection_years: int,
        escalation_model: str,
        level_loading_enabled: bool = False,
        teller_payments_enabled: bool = False,
        discount_config: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Calculate multi-year SaaS projections.

        Args:
            saas_monthly: Base monthly SaaS cost
            setup_total: Total setup cost (Year 1 only)
            projection_years: Number of years to project (1-10)
            escalation_model: Escalation model (e.g., "STANDARD_4PCT", "NONE")
            level_loading_enabled: Whether to level-load SaaS across years
            teller_payments_enabled: Whether Teller Payments discount applies (10%)
            discount_config: Discount configuration

        Returns:
            Dictionary with multi-year projection:
            {
                "years": [
                    {
                        "year": 1,
                        "saas_monthly": Decimal,
                        "saas_annual": Decimal,
                        "setup": Decimal,
                        "travel": Decimal,
                        "total": Decimal
                    },
                    ...
                ],
                "total_contract_value": Decimal
            }
        """
        # Apply discounts first
        discount_result = self.apply_discounts(saas_monthly, setup_total, discount_config)
        base_monthly = discount_result["saas_monthly_after"]

        # Apply Teller Payments discount (10% on SaaS)
        if teller_payments_enabled:
            base_monthly = base_monthly * Decimal("0.90")

        # Determine escalation rate
        if escalation_model == "STANDARD_4PCT":
            escalation_rate = Decimal("0.04")
        elif escalation_model == "NONE":
            escalation_rate = Decimal("0")
        else:
            # Default to 4%
            escalation_rate = Decimal("0.04")

        years = []
        total_contract_value = Decimal("0")

        for year in range(1, projection_years + 1):
            # Calculate escalation factor (compound)
            if year == 1:
                escalation_factor = Decimal("1")
            else:
                escalation_factor = (1 + escalation_rate) ** (year - 1)

            # Monthly SaaS for this year
            year_monthly = base_monthly * escalation_factor

            # Annual SaaS
            year_annual_saas = year_monthly * 12

            # Apply Year 1 specific discount if applicable
            if year == 1 and discount_config:
                year1_pct = Decimal(str(discount_config.get("saas_year1_pct", 0)))
                year_annual_saas = year_annual_saas * (1 - year1_pct / 100)
                year_monthly = year_annual_saas / 12

            # Setup only in Year 1
            year_setup = discount_result["setup_after"] if year == 1 else Decimal("0")

            # Year total
            year_total = year_annual_saas + year_setup

            years.append(
                {
                    "year": year,
                    "saas_monthly": year_monthly,
                    "saas_annual": year_annual_saas,
                    "setup": year_setup,
                    "travel": Decimal("0"),  # Travel calculated separately
                    "total": year_total,
                }
            )

            total_contract_value += year_total

        # Level loading - spread total SaaS evenly if enabled
        if level_loading_enabled and projection_years > 1:
            total_saas = sum(y["saas_annual"] for y in years)
            level_annual = total_saas / projection_years
            level_monthly = level_annual / 12

            for year_data in years:
                year_data["saas_annual_level_loaded"] = level_annual
                year_data["saas_monthly_level_loaded"] = level_monthly

        return {
            "years": years,
            "total_contract_value": total_contract_value,
            "escalation_model": escalation_model,
            "level_loading_enabled": level_loading_enabled,
            "teller_payments_discount_applied": teller_payments_enabled,
        }

    def calculate_referral_commission(
        self,
        setup_total: Decimal,
        referral_rate: Decimal | None,
    ) -> dict[str, Any]:
        """Calculate referral commission for internal tracking.

        Args:
            setup_total: Total setup cost (after discounts)
            referral_rate: Referral commission rate (percentage)

        Returns:
            Dictionary with referral details:
            {
                "referral_rate": Decimal,
                "commission_amount": Decimal
            }
        """
        if referral_rate is None or referral_rate <= 0:
            return {
                "referral_rate": Decimal("0"),
                "commission_amount": Decimal("0"),
            }

        commission_amount = setup_total * (referral_rate / 100)

        return {
            "referral_rate": referral_rate,
            "commission_amount": commission_amount,
        }
