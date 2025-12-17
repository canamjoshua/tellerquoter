"""Integration type model for configuration-driven integrations."""

from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import DECIMAL, Boolean, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class IntegrationType(Base):  # type: ignore[misc]
    """Integration type with configurable pricing and rules.

    This table defines types of integrations (bi-directional, payment import)
    with their monthly costs and setup SKU references. This allows administrators
    to modify integration pricing without code changes.
    """

    __tablename__ = "IntegrationTypes"

    Id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4, name="Id"
    )
    PricingVersionId: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=False,
        name="PricingVersionId",
        index=True,
    )
    TypeCode: Mapped[str] = mapped_column(String(50), nullable=False, name="TypeCode", index=True)
    TypeName: Mapped[str] = mapped_column(String(255), nullable=False, name="TypeName")
    Description: Mapped[str | None] = mapped_column(Text, nullable=True, name="Description")
    MonthlyCost: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False, name="MonthlyCost")
    MatureSetupSKU: Mapped[str | None] = mapped_column(
        String(50), nullable=True, name="MatureSetupSKU"
    )
    CustomSetupSKU: Mapped[str | None] = mapped_column(
        String(50), nullable=True, name="CustomSetupSKU"
    )
    RequiredParameters: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, default=list, name="RequiredParameters"
    )
    IsActive: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, name="IsActive")
    SortOrder: Mapped[int] = mapped_column(Integer, nullable=False, default=0, name="SortOrder")
    CreatedAt: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, name="CreatedAt"
    )
    UpdatedAt: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        name="UpdatedAt",
    )

    def __repr__(self) -> str:
        """Return string representation."""
        return f"<IntegrationType {self.TypeCode}: {self.TypeName}>"
