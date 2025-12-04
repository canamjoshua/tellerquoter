"""SaaS Product models - PascalCase table names AND columns."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID as UUIDType
from uuid import uuid4

from sqlalchemy import DECIMAL, Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class SaaSProduct(Base):  # type: ignore[misc]
    """
    SaaS products table.

    Stores SaaS product definitions with tiered pricing structure.
    Linked to specific pricing versions for immutability.
    """

    __tablename__ = "SaaSProducts"

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
    ProductCode: Mapped[str] = mapped_column(
        "ProductCode",
        String(50),
        nullable=False,
        index=True,
        comment="Unique product identifier (e.g., 'SAAS-001', 'SAAS-002')",
    )
    Name: Mapped[str] = mapped_column(
        "Name",
        String(255),
        nullable=False,
        comment="Display name for SaaS product",
    )
    Description: Mapped[str | None] = mapped_column(
        "Description",
        Text,
        nullable=True,
        comment="Detailed description of the product",
    )
    Category: Mapped[str] = mapped_column(
        "Category",
        String(50),
        nullable=False,
        index=True,
        comment="Product category (e.g., 'Core', 'Optional', 'Add-on')",
    )
    PricingModel: Mapped[str] = mapped_column(
        "PricingModel",
        String(50),
        nullable=False,
        comment="Pricing model type (e.g., 'Tiered', 'Flat', 'Usage-based')",
    )
    Tier1Min: Mapped[int] = mapped_column(
        "Tier1Min",
        Integer,
        nullable=False,
        default=0,
        comment="Minimum users for tier 1",
    )
    Tier1Max: Mapped[int] = mapped_column(
        "Tier1Max",
        Integer,
        nullable=False,
        comment="Maximum users for tier 1",
    )
    Tier1Price: Mapped[Decimal] = mapped_column(
        "Tier1Price",
        DECIMAL(10, 2),
        nullable=False,
        comment="Price per user for tier 1",
    )
    Tier2Min: Mapped[int | None] = mapped_column(
        "Tier2Min",
        Integer,
        nullable=True,
        comment="Minimum users for tier 2",
    )
    Tier2Max: Mapped[int | None] = mapped_column(
        "Tier2Max",
        Integer,
        nullable=True,
        comment="Maximum users for tier 2",
    )
    Tier2Price: Mapped[Decimal | None] = mapped_column(
        "Tier2Price",
        DECIMAL(10, 2),
        nullable=True,
        comment="Price per user for tier 2",
    )
    Tier3Min: Mapped[int | None] = mapped_column(
        "Tier3Min",
        Integer,
        nullable=True,
        comment="Minimum users for tier 3",
    )
    Tier3Max: Mapped[int | None] = mapped_column(
        "Tier3Max",
        Integer,
        nullable=True,
        comment="Maximum users for tier 3 (null for unlimited)",
    )
    Tier3Price: Mapped[Decimal | None] = mapped_column(
        "Tier3Price",
        DECIMAL(10, 2),
        nullable=True,
        comment="Price per user for tier 3",
    )
    IsActive: Mapped[bool] = mapped_column(
        "IsActive",
        Boolean,
        default=True,
        server_default="true",
        nullable=False,
        comment="False if product is discontinued",
    )
    IsRequired: Mapped[bool] = mapped_column(
        "IsRequired",
        Boolean,
        default=False,
        server_default="false",
        nullable=False,
        comment="True if product is required in all quotes",
    )
    SortOrder: Mapped[int] = mapped_column(
        "SortOrder",
        Integer,
        nullable=False,
        default=0,
        server_default="0",
        comment="Display order for UI",
    )
    CreatedAt: Mapped[datetime] = mapped_column(
        "CreatedAt",
        server_default=func.now(),
        nullable=False,
        comment="Timestamp when product was created",
    )
    UpdatedAt: Mapped[datetime] = mapped_column(
        "UpdatedAt",
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="Timestamp when product was last updated",
    )

    def __repr__(self) -> str:
        """String representation."""
        return f"<SaaSProduct(code={self.ProductCode}, name={self.Name})>"
