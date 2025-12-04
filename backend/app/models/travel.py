"""Travel Zone models - PascalCase table names AND columns."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID as UUIDType
from uuid import uuid4

from sqlalchemy import DECIMAL, Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class TravelZone(Base):  # type: ignore[misc]
    """
    Travel zones table.

    Stores travel zone definitions with pricing for different regions.
    Linked to specific pricing versions for immutability.
    """

    __tablename__ = "TravelZones"

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
    ZoneCode: Mapped[str] = mapped_column(
        "ZoneCode",
        String(50),
        nullable=False,
        index=True,
        comment="Unique zone identifier (e.g., 'ZONE-1', 'ZONE-2')",
    )
    Name: Mapped[str] = mapped_column(
        "Name",
        String(255),
        nullable=False,
        comment="Display name for travel zone",
    )
    Description: Mapped[str | None] = mapped_column(
        "Description",
        Text,
        nullable=True,
        comment="Detailed description of the zone (e.g., 'United States, Canada, Caribbean')",
    )
    MileageRate: Mapped[Decimal] = mapped_column(
        "MileageRate",
        DECIMAL(10, 2),
        nullable=False,
        comment="Rate per mile for this zone",
    )
    DailyRate: Mapped[Decimal] = mapped_column(
        "DailyRate",
        DECIMAL(10, 2),
        nullable=False,
        comment="Daily rate for travel in this zone",
    )
    HourlyRate: Mapped[Decimal] = mapped_column(
        "HourlyRate",
        DECIMAL(10, 2),
        nullable=False,
        comment="Hourly rate for on-site work in this zone",
    )
    OnsiteDaysIncluded: Mapped[int] = mapped_column(
        "OnsiteDaysIncluded",
        nullable=False,
        default=0,
        comment="Number of on-site days included in base price",
    )
    IsActive: Mapped[bool] = mapped_column(
        "IsActive",
        Boolean,
        default=True,
        server_default="true",
        nullable=False,
        comment="False if zone is no longer offered",
    )
    SortOrder: Mapped[int] = mapped_column(
        "SortOrder",
        nullable=False,
        default=0,
        server_default="0",
        comment="Display order for UI",
    )
    CreatedAt: Mapped[datetime] = mapped_column(
        "CreatedAt",
        server_default=func.now(),
        nullable=False,
        comment="Timestamp when zone was created",
    )
    UpdatedAt: Mapped[datetime] = mapped_column(
        "UpdatedAt",
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="Timestamp when zone was last updated",
    )

    def __repr__(self) -> str:
        """String representation."""
        return f"<TravelZone(code={self.ZoneCode}, name={self.Name})>"
