"""Pricing models - PascalCase table names, snake_case columns."""

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

    id: Mapped[UUIDType] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=func.gen_random_uuid(),
    )
    version_number: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False,
        index=True,
        comment="Version identifier (e.g., '2025.1', '2025.2')",
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Description of changes in this version",
    )
    effective_date: Mapped[datetime] = mapped_column(
        Date,
        nullable=False,
        comment="Date when this pricing becomes effective",
    )
    expiration_date: Mapped[datetime | None] = mapped_column(
        Date,
        nullable=True,
        comment="Date when this pricing expires (null if current)",
    )
    created_by: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="User who created this version",
    )
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        nullable=False,
        comment="Timestamp when version was created",
    )
    is_current: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="false",
        nullable=False,
        comment="True if this is the current active version",
    )
    is_locked: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="false",
        nullable=False,
        comment="True if version is locked (used in quotes)",
    )

    def __repr__(self) -> str:
        """String representation."""
        return f"<PricingVersion(version={self.version_number}, current={self.is_current})>"
