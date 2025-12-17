"""add_pricing_rules_table

Revision ID: b35b87907902
Revises: 5961666e63cc
Create Date: 2025-12-16 19:51:13.423704

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b35b87907902"
down_revision: str | Sequence[str] | None = "5961666e63cc"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add PricingRules table for configuration-driven calculations.

    This table stores formulas, tier definitions, and calculation rules
    that can be managed by administrators without code changes.
    """
    op.create_table(
        "PricingRules",
        sa.Column(
            "Id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "PricingVersionId",
            sa.UUID(),
            nullable=False,
            comment="Link to pricing version",
        ),
        sa.Column(
            "RuleCode",
            sa.String(length=50),
            nullable=False,
            comment="Unique rule identifier (e.g., COMPLEXITY_FACTOR)",
        ),
        sa.Column(
            "RuleName",
            sa.String(length=255),
            nullable=False,
            comment="Display name for rule",
        ),
        sa.Column(
            "Description",
            sa.Text(),
            nullable=True,
            comment="Description of what this rule calculates",
        ),
        sa.Column(
            "RuleType",
            sa.String(length=50),
            nullable=False,
            comment="Type of rule: FORMULA, TIER, THRESHOLD, etc.",
        ),
        sa.Column(
            "Configuration",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            comment="JSONB configuration for the rule",
        ),
        sa.Column(
            "IsActive",
            sa.Boolean(),
            server_default="true",
            nullable=False,
            comment="False if rule is disabled",
        ),
        sa.Column(
            "SortOrder",
            sa.Integer(),
            server_default="0",
            nullable=False,
            comment="Order for rule evaluation",
        ),
        sa.Column(
            "CreatedAt",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "UpdatedAt",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["PricingVersionId"],
            ["PricingVersions.Id"],
            name=op.f("fk_PricingRules_PricingVersionId_PricingVersions"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("Id", name=op.f("pk_PricingRules")),
    )
    op.create_index(
        op.f("ix_PricingRules_PricingVersionId"),
        "PricingRules",
        ["PricingVersionId"],
        unique=False,
    )
    op.create_index(
        op.f("ix_PricingRules_RuleCode"),
        "PricingRules",
        ["RuleCode"],
        unique=False,
    )


def downgrade() -> None:
    """Remove PricingRules table."""
    op.drop_index(op.f("ix_PricingRules_RuleCode"), table_name="PricingRules")
    op.drop_index(op.f("ix_PricingRules_PricingVersionId"), table_name="PricingRules")
    op.drop_table("PricingRules")
