"""Pricing models - PascalCase table names AND columns."""

from datetime import datetime
from uuid import UUID as UUIDType
from uuid import uuid4

from sqlalchemy import Boolean, Date, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class PricingVersion(Base):  # type: ignore[misc]
    """
    Pricing versions table (immutable once used in quotes).

    Stores versioned pricing configurations for SKUs, SaaS products,
    travel zones, and calculation parameters.
    """

    __tablename__ = "PricingVersions"

    Id: Mapped[UUIDType] = mapped_column(
        "Id",
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=func.gen_random_uuid(),
    )
    VersionNumber: Mapped[str] = mapped_column(
        "VersionNumber",
        String(20),
        unique=True,
        nullable=False,
        index=True,
        comment="Version identifier (e.g., '2025.1', '2025.2')",
    )
    Description: Mapped[str | None] = mapped_column(
        "Description",
        Text,
        nullable=True,
        comment="Description of changes in this version",
    )
    EffectiveDate: Mapped[datetime] = mapped_column(
        "EffectiveDate",
        Date,
        nullable=False,
        comment="Date when this pricing becomes effective",
    )
    ExpirationDate: Mapped[datetime | None] = mapped_column(
        "ExpirationDate",
        Date,
        nullable=True,
        comment="Date when this pricing expires (null if current)",
    )
    CreatedBy: Mapped[str] = mapped_column(
        "CreatedBy",
        String(255),
        nullable=False,
        comment="User who created this version",
    )
    CreatedAt: Mapped[datetime] = mapped_column(
        "CreatedAt",
        server_default=func.now(),
        nullable=False,
        comment="Timestamp when version was created",
    )
    IsCurrent: Mapped[bool] = mapped_column(
        "IsCurrent",
        Boolean,
        default=False,
        server_default="false",
        nullable=False,
        comment="True if this is the current active version",
    )
    IsLocked: Mapped[bool] = mapped_column(
        "IsLocked",
        Boolean,
        default=False,
        server_default="false",
        nullable=False,
        comment="True if version is locked (used in quotes)",
    )

    def __repr__(self) -> str:
        """String representation."""
        return f"<PricingVersion(version={self.VersionNumber}, current={self.IsCurrent})>"
