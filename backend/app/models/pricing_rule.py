"""Pricing rule model for configuration-driven calculations.

This model stores configurable formulas and rules that determine how
various quote calculations are performed, allowing administrators to
modify pricing logic without code changes.
"""

from datetime import datetime
from typing import Any
from uuid import UUID as UUIDType
from uuid import uuid4

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class PricingRule(Base):  # type: ignore[misc]
    """Configurable pricing rule for quote calculations.

    This table stores formulas, tier definitions, and calculation rules
    that can be managed by administrators. Common rule types include:
    - COMPLEXITY_FACTOR: Organization Setup complexity calculation
    - DISCOUNT_LIMITS: Maximum discount percentages by type
    - TRAVEL_DEFAULTS: Default travel rates and calculations
    - ESCALATION: Annual escalation rates and models

    The Configuration column stores a JSONB document with the specific
    rule parameters, allowing flexible schema for different rule types.
    """

    __tablename__ = "PricingRules"

    Id: Mapped[UUIDType] = mapped_column(
        "Id",
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=func.gen_random_uuid(),
    )
    PricingVersionId: Mapped[UUIDType] = mapped_column(
        "PricingVersionId",
        UUID(as_uuid=True),
        ForeignKey("PricingVersions.Id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="Link to pricing version",
    )
    RuleCode: Mapped[str] = mapped_column(
        "RuleCode",
        String(50),
        nullable=False,
        index=True,
        comment="Unique rule identifier (e.g., COMPLEXITY_FACTOR)",
    )
    RuleName: Mapped[str] = mapped_column(
        "RuleName",
        String(255),
        nullable=False,
        comment="Display name for rule",
    )
    Description: Mapped[str | None] = mapped_column(
        "Description",
        Text,
        nullable=True,
        comment="Description of what this rule calculates",
    )
    RuleType: Mapped[str] = mapped_column(
        "RuleType",
        String(50),
        nullable=False,
        comment="Type of rule: FORMULA, TIER, THRESHOLD, etc.",
    )
    Configuration: Mapped[dict[str, Any]] = mapped_column(
        "Configuration",
        JSONB,
        nullable=False,
        default=dict,
        comment="JSONB configuration for the rule",
    )
    IsActive: Mapped[bool] = mapped_column(
        "IsActive",
        Boolean,
        default=True,
        server_default="true",
        nullable=False,
        comment="False if rule is disabled",
    )
    SortOrder: Mapped[int] = mapped_column(
        "SortOrder",
        Integer,
        nullable=False,
        default=0,
        server_default="0",
        comment="Order for rule evaluation",
    )
    CreatedAt: Mapped[datetime] = mapped_column(
        "CreatedAt",
        server_default=func.now(),
        nullable=False,
    )
    UpdatedAt: Mapped[datetime] = mapped_column(
        "UpdatedAt",
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        """String representation."""
        return f"<PricingRule(code={self.RuleCode}, name={self.RuleName})>"


# Example configurations for different rule types:
#
# COMPLEXITY_FACTOR Configuration:
# {
#     "formula": {
#         "type": "weighted_sum",
#         "components": [
#             {"parameter": "departments", "weight": 1.0},
#             {"parameter": "revenue_templates", "weight": 0.25},
#             {"parameter": "payment_imports", "weight": 1.0}
#         ]
#     },
#     "tiers": [
#         {
#             "name": "Basic",
#             "code": "BASIC",
#             "min_score": 0,
#             "max_score": 10,
#             "sku_code": "ORG-SETUP-BASIC",
#             "base_price": 64400.00,
#             "estimated_hours": 280
#         },
#         {
#             "name": "Medium",
#             "code": "MEDIUM",
#             "min_score": 11,
#             "max_score": 20,
#             "sku_code": "ORG-SETUP-MEDIUM",
#             "base_price": 98440.00,
#             "estimated_hours": 428
#         },
#         {
#             "name": "Large",
#             "code": "LARGE",
#             "min_score": 21,
#             "max_score": null,
#             "sku_code": "ORG-SETUP-LARGE",
#             "base_price": 176640.00,
#             "estimated_hours": 768
#         }
#     ],
#     "additional_department": {
#         "sku_code": "ORG-SETUP-ADDITIONAL-DEPT",
#         "price_per_dept": 4140.00,
#         "hours_per_dept": 18,
#         "first_included": 1
#     }
# }
#
# ESCALATION Configuration:
# {
#     "models": {
#         "STANDARD_4PCT": {
#             "name": "Standard 4%",
#             "rate": 0.04,
#             "compound": true
#         },
#         "NONE": {
#             "name": "No Escalation",
#             "rate": 0,
#             "compound": false
#         },
#         "CUSTOM": {
#             "name": "Custom Rate",
#             "rate": null,
#             "compound": true,
#             "user_defined": true
#         }
#     },
#     "default_model": "STANDARD_4PCT"
# }
#
# DISCOUNT_LIMITS Configuration:
# {
#     "saas_year1_max_pct": 15,
#     "saas_all_years_max_pct": 10,
#     "setup_max_pct": 20,
#     "setup_max_fixed": 50000,
#     "approval_thresholds": {
#         "manager": {"saas_pct": 5, "setup_pct": 10},
#         "director": {"saas_pct": 10, "setup_pct": 15},
#         "vp": {"saas_pct": 15, "setup_pct": 20}
#     }
# }
