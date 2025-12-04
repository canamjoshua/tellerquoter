"""Mature Integration models - PascalCase table names AND columns."""

from datetime import datetime
from uuid import UUID as UUIDType
from uuid import uuid4

from sqlalchemy import Boolean, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class MatureIntegration(Base):  # type: ignore[misc]
    """
    Mature integrations table.

    Stores list of mature (pre-built) integrations available for quotes.
    These are systems that have existing integrations and don't require custom work.
    """

    __tablename__ = "MatureIntegrations"

    Id: Mapped[UUIDType] = mapped_column(
        "Id",
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=func.gen_random_uuid(),
    )
    IntegrationCode: Mapped[str] = mapped_column(
        "IntegrationCode",
        String(50),
        unique=True,
        nullable=False,
        index=True,
        comment="Unique integration identifier code",
    )
    SystemName: Mapped[str] = mapped_column(
        "SystemName",
        String(255),
        nullable=False,
        comment="Name of the integrated system",
    )
    Vendor: Mapped[str | None] = mapped_column(
        "Vendor",
        String(255),
        nullable=True,
        comment="Vendor/provider of the system",
    )
    Comments: Mapped[str | None] = mapped_column(
        "Comments",
        Text,
        nullable=True,
        comment="Additional notes about the integration",
    )
    IsActive: Mapped[bool] = mapped_column(
        "IsActive",
        Boolean,
        default=True,
        server_default="true",
        nullable=False,
        comment="False if integration is no longer offered",
    )
    CreatedAt: Mapped[datetime] = mapped_column(
        "CreatedAt",
        server_default=func.now(),
        nullable=False,
        comment="Timestamp when integration was added",
    )
    UpdatedAt: Mapped[datetime] = mapped_column(
        "UpdatedAt",
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="Timestamp when integration was last updated",
    )

    def __repr__(self) -> str:
        """String representation."""
        return f"<MatureIntegration(code={self.IntegrationCode}, system={self.SystemName})>"
