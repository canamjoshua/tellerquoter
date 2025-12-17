"""add_configuration_driven_tables

Revision ID: 43a013150420
Revises: 0f3e7b4204dc
Create Date: 2025-12-09 14:56:22.852181

Adds configuration-driven architecture for SaaS products:
- IntegrationTypes table for configurable integration pricing
- OnlineFormTiers table for configurable form tier pricing
- Adds configuration columns to SaaSProducts table
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "43a013150420"
down_revision: str | Sequence[str] | None = "0f3e7b4204dc"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create IntegrationTypes table
    op.create_table(
        "IntegrationTypes",
        sa.Column(
            "Id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("PricingVersionId", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("TypeCode", sa.String(50), nullable=False),
        sa.Column("TypeName", sa.String(255), nullable=False),
        sa.Column("Description", sa.Text, nullable=True),
        sa.Column("MonthlyCost", sa.DECIMAL(10, 2), nullable=False),
        sa.Column("MatureSetupSKU", sa.String(50), nullable=True),
        sa.Column("CustomSetupSKU", sa.String(50), nullable=True),
        sa.Column("RequiredParameters", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("IsActive", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("SortOrder", sa.Integer, nullable=False, server_default="0"),
        sa.Column("CreatedAt", sa.DateTime, nullable=False, server_default=sa.text("now()")),
        sa.Column("UpdatedAt", sa.DateTime, nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["PricingVersionId"], ["PricingVersions.Id"], ondelete="RESTRICT"),
        sa.UniqueConstraint(
            "PricingVersionId", "TypeCode", name="uq_integration_types_version_code"
        ),
    )
    op.create_index(
        "ix_IntegrationTypes_PricingVersionId", "IntegrationTypes", ["PricingVersionId"]
    )
    op.create_index("ix_IntegrationTypes_TypeCode", "IntegrationTypes", ["TypeCode"])

    # Create OnlineFormTiers table
    op.create_table(
        "OnlineFormTiers",
        sa.Column(
            "Id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("PricingVersionId", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("TierCode", sa.String(50), nullable=False),
        sa.Column("TierName", sa.String(255), nullable=False),
        sa.Column("Description", sa.Text, nullable=True),
        sa.Column("SetupSKU", sa.String(50), nullable=False),
        sa.Column("SetupCost", sa.DECIMAL(10, 2), nullable=False),
        sa.Column("WorkflowAddonSKU", sa.String(50), nullable=True),
        sa.Column("WorkflowAddonCost", sa.DECIMAL(10, 2), nullable=True),
        sa.Column("SelectionCriteria", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("IsActive", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("SortOrder", sa.Integer, nullable=False, server_default="0"),
        sa.Column("CreatedAt", sa.DateTime, nullable=False, server_default=sa.text("now()")),
        sa.Column("UpdatedAt", sa.DateTime, nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["PricingVersionId"], ["PricingVersions.Id"], ondelete="RESTRICT"),
        sa.UniqueConstraint(
            "PricingVersionId", "TierCode", name="uq_online_form_tiers_version_code"
        ),
    )
    op.create_index("ix_OnlineFormTiers_PricingVersionId", "OnlineFormTiers", ["PricingVersionId"])
    op.create_index("ix_OnlineFormTiers_TierCode", "OnlineFormTiers", ["TierCode"])

    # Add configuration columns to SaaSProducts table
    op.add_column(
        "SaaSProducts",
        sa.Column("ProductType", sa.String(50), nullable=True, server_default="module"),
    )
    op.add_column(
        "SaaSProducts",
        sa.Column("RequiredParameters", postgresql.JSONB, nullable=False, server_default="[]"),
    )
    op.add_column(
        "SaaSProducts",
        sa.Column("SelectionRules", postgresql.JSONB, nullable=False, server_default="{}"),
    )
    op.add_column(
        "SaaSProducts",
        sa.Column("PricingFormula", postgresql.JSONB, nullable=False, server_default="{}"),
    )
    op.add_column(
        "SaaSProducts",
        sa.Column("RelatedSetupSKUs", postgresql.JSONB, nullable=False, server_default="[]"),
    )
    op.add_column(
        "SaaSProducts",
        sa.Column("Dependencies", postgresql.JSONB, nullable=False, server_default="[]"),
    )

    # Make ProductType non-nullable after setting default
    op.alter_column("SaaSProducts", "ProductType", nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Remove configuration columns from SaaSProducts
    op.drop_column("SaaSProducts", "Dependencies")
    op.drop_column("SaaSProducts", "RelatedSetupSKUs")
    op.drop_column("SaaSProducts", "PricingFormula")
    op.drop_column("SaaSProducts", "SelectionRules")
    op.drop_column("SaaSProducts", "RequiredParameters")
    op.drop_column("SaaSProducts", "ProductType")

    # Drop OnlineFormTiers table
    op.drop_index("ix_OnlineFormTiers_TierCode", "OnlineFormTiers")
    op.drop_index("ix_OnlineFormTiers_PricingVersionId", "OnlineFormTiers")
    op.drop_table("OnlineFormTiers")

    # Drop IntegrationTypes table
    op.drop_index("ix_IntegrationTypes_TypeCode", "IntegrationTypes")
    op.drop_index("ix_IntegrationTypes_PricingVersionId", "IntegrationTypes")
    op.drop_table("IntegrationTypes")
