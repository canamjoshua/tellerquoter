"""create_quote_tables

Revision ID: 18844e9ac827
Revises: f82fb4b4bec6
Create Date: 2025-12-04 15:39:48.539726

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "18844e9ac827"
down_revision: str | Sequence[str] | None = "f82fb4b4bec6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create Quotes table
    op.create_table(
        "Quotes",
        sa.Column(
            "Id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("QuoteNumber", sa.String(50), nullable=False, unique=True),
        sa.Column("ClientName", sa.String(255), nullable=False),
        sa.Column("ClientOrganization", sa.String(255), nullable=True),
        sa.Column("CreatedBy", sa.String(255), nullable=False),
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
        sa.Column("Status", sa.String(50), server_default="DRAFT", nullable=False),
        sa.PrimaryKeyConstraint("Id"),
    )

    # Create indexes for Quotes
    op.create_index("ix_Quotes_QuoteNumber", "Quotes", ["QuoteNumber"])
    op.create_index("ix_Quotes_ClientName", "Quotes", ["ClientName"])
    op.create_index("ix_Quotes_CreatedBy", "Quotes", ["CreatedBy"])

    # Create QuoteVersions table
    op.create_table(
        "QuoteVersions",
        sa.Column(
            "Id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("QuoteId", sa.UUID(), nullable=False),
        sa.Column("VersionNumber", sa.Integer(), nullable=False),
        sa.Column("VersionDescription", sa.Text(), nullable=True),
        sa.Column("PricingVersionId", sa.UUID(), nullable=False),
        sa.Column("ClientData", sa.JSON(), nullable=False),
        sa.Column("ProjectionYears", sa.Integer(), server_default="5", nullable=False),
        sa.Column("EscalationModel", sa.String(50), server_default="STANDARD_4PCT", nullable=False),
        sa.Column("MultiYearFreezeYears", sa.Integer(), nullable=True),
        sa.Column("LevelLoadingEnabled", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("TellerPaymentsEnabled", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("DiscountConfig", sa.JSON(), nullable=True),
        sa.Column("ReferrerId", sa.UUID(), nullable=True),
        sa.Column("ReferralRateOverride", sa.Numeric(5, 2), nullable=True),
        sa.Column("MilestoneStyle", sa.String(50), server_default="FIXED_MONTHLY", nullable=False),
        sa.Column(
            "InitialPaymentPercentage", sa.Numeric(5, 2), server_default="25.00", nullable=False
        ),
        sa.Column("ProjectDurationMonths", sa.Integer(), server_default="10", nullable=False),
        sa.Column("TravelZoneId", sa.UUID(), nullable=True),
        sa.Column("TravelConfig", sa.JSON(), nullable=True),
        sa.Column("TotalSaaSMonthly", sa.Numeric(10, 2), nullable=True),
        sa.Column("TotalSaaSAnnualYear1", sa.Numeric(10, 2), nullable=True),
        sa.Column("TotalSetupPackages", sa.Numeric(10, 2), nullable=True),
        sa.Column("TotalTravel", sa.Numeric(10, 2), nullable=True),
        sa.Column("TotalContractedAmount", sa.Numeric(10, 2), nullable=True),
        sa.Column("CreatedBy", sa.String(255), nullable=False),
        sa.Column(
            "CreatedAt",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("VersionStatus", sa.String(50), server_default="DRAFT", nullable=False),
        sa.PrimaryKeyConstraint("Id"),
        sa.ForeignKeyConstraint(["QuoteId"], ["Quotes.Id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["PricingVersionId"], ["PricingVersions.Id"]),
        sa.ForeignKeyConstraint(["ReferrerId"], ["Referrers.Id"]),
        sa.ForeignKeyConstraint(["TravelZoneId"], ["TravelZones.Id"]),
        sa.UniqueConstraint("QuoteId", "VersionNumber", name="uq_quote_version_number"),
    )

    # Create indexes for QuoteVersions
    op.create_index("ix_QuoteVersions_QuoteId", "QuoteVersions", ["QuoteId"])
    op.create_index("ix_QuoteVersions_PricingVersionId", "QuoteVersions", ["PricingVersionId"])

    # Create QuoteVersionSaaSProducts table
    op.create_table(
        "QuoteVersionSaaSProducts",
        sa.Column(
            "Id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("QuoteVersionId", sa.UUID(), nullable=False),
        sa.Column("SaaSProductId", sa.UUID(), nullable=False),
        sa.Column("Quantity", sa.Numeric(10, 2), nullable=False),
        sa.Column("CalculatedMonthlyPrice", sa.Numeric(10, 2), nullable=False),
        sa.Column("Notes", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("Id"),
        sa.ForeignKeyConstraint(["QuoteVersionId"], ["QuoteVersions.Id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["SaaSProductId"], ["SaaSProducts.Id"]),
    )

    # Create QuoteVersionSetupPackages table
    op.create_table(
        "QuoteVersionSetupPackages",
        sa.Column(
            "Id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("QuoteVersionId", sa.UUID(), nullable=False),
        sa.Column("SKUDefinitionId", sa.UUID(), nullable=False),
        sa.Column("Quantity", sa.Integer(), server_default="1", nullable=False),
        sa.Column("CalculatedPrice", sa.Numeric(10, 2), nullable=False),
        sa.Column("CustomScopeNotes", sa.Text(), nullable=True),
        sa.Column("SequenceOrder", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("Id"),
        sa.ForeignKeyConstraint(["QuoteVersionId"], ["QuoteVersions.Id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["SKUDefinitionId"], ["SKUDefinitions.Id"]),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("QuoteVersionSetupPackages")
    op.drop_table("QuoteVersionSaaSProducts")
    op.drop_index("ix_QuoteVersions_PricingVersionId", "QuoteVersions")
    op.drop_index("ix_QuoteVersions_QuoteId", "QuoteVersions")
    op.drop_table("QuoteVersions")
    op.drop_index("ix_Quotes_CreatedBy", "Quotes")
    op.drop_index("ix_Quotes_ClientName", "Quotes")
    op.drop_index("ix_Quotes_QuoteNumber", "Quotes")
    op.drop_table("Quotes")
