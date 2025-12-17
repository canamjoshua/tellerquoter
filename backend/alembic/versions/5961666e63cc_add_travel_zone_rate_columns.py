"""add_travel_zone_rate_columns

Revision ID: 5961666e63cc
Revises: 43a013150420
Create Date: 2025-12-16 19:41:42.674236

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "5961666e63cc"
down_revision: str | Sequence[str] | None = "43a013150420"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add travel zone rate columns for v2.0 travel cost calculation.

    These columns support the v2.0 travel cost formula:
    Trip Cost = (Airfare × People) + (Hotel × People × Nights) +
                (Per Diem × People × Nights) + (Vehicle × Nights)
    """
    op.add_column(
        "TravelZones",
        sa.Column(
            "AirfareEstimate",
            sa.DECIMAL(precision=10, scale=2),
            server_default="0",
            nullable=False,
            comment="Estimated airfare per person for this zone",
        ),
    )
    op.add_column(
        "TravelZones",
        sa.Column(
            "HotelRate",
            sa.DECIMAL(precision=10, scale=2),
            server_default="180",
            nullable=False,
            comment="Hotel rate per night per person",
        ),
    )
    op.add_column(
        "TravelZones",
        sa.Column(
            "PerDiemRate",
            sa.DECIMAL(precision=10, scale=2),
            server_default="60",
            nullable=False,
            comment="Per diem (meals/incidentals) per day per person",
        ),
    )
    op.add_column(
        "TravelZones",
        sa.Column(
            "VehicleRate",
            sa.DECIMAL(precision=10, scale=2),
            server_default="125",
            nullable=False,
            comment="Vehicle rental rate per day (shared)",
        ),
    )


def downgrade() -> None:
    """Remove travel zone rate columns."""
    op.drop_column("TravelZones", "VehicleRate")
    op.drop_column("TravelZones", "PerDiemRate")
    op.drop_column("TravelZones", "HotelRate")
    op.drop_column("TravelZones", "AirfareEstimate")
