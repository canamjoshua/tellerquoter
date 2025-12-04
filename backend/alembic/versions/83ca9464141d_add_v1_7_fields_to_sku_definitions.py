"""add_v1_7_fields_to_sku_definitions

Revision ID: 83ca9464141d
Revises: 77857d070f6f
Create Date: 2025-12-04 08:27:28.151349

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "83ca9464141d"
down_revision: str | Sequence[str] | None = "77857d070f6f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema - Add v1.7 fields to SKUDefinitions table."""
    # Add EarmarkedStatus field
    op.add_column(
        "SKUDefinitions",
        sa.Column(
            "EarmarkedStatus",
            sa.Boolean(),
            nullable=False,
            server_default="false",
            comment="True if pricing is subject to change during project refinement",
        ),
    )

    # Add EstimatedHours field
    op.add_column(
        "SKUDefinitions",
        sa.Column(
            "EstimatedHours",
            sa.Integer(),
            nullable=True,
            comment="Estimated hours for this SKU (NULL for TBD)",
        ),
    )

    # Add AcceptanceCriteria field
    op.add_column(
        "SKUDefinitions",
        sa.Column(
            "AcceptanceCriteria",
            sa.String(length=500),
            nullable=True,
            comment="Acceptance criteria for deliverable completion",
        ),
    )


def downgrade() -> None:
    """Downgrade schema - Remove v1.7 fields from SKUDefinitions table."""
    op.drop_column("SKUDefinitions", "AcceptanceCriteria")
    op.drop_column("SKUDefinitions", "EstimatedHours")
    op.drop_column("SKUDefinitions", "EarmarkedStatus")
