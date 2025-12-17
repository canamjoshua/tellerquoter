"""SKU Definition models - PascalCase table names AND columns."""

from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID as UUIDType
from uuid import uuid4

from sqlalchemy import DECIMAL, Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class SKUDefinition(Base):  # type: ignore[misc]
    """
    SKU definitions table.

    Stores hardware and service SKUs with pricing and metadata.
    Linked to specific pricing versions for immutability.
    """

    __tablename__ = "SKUDefinitions"

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
    SKUCode: Mapped[str] = mapped_column(
        "SKUCode",
        String(50),
        nullable=False,
        index=True,
        comment="Unique SKU identifier (e.g., 'TT-100', 'TR-200')",
    )
    Name: Mapped[str] = mapped_column(
        "Name",
        String(255),
        nullable=False,
        comment="Display name for SKU",
    )
    Description: Mapped[str | None] = mapped_column(
        "Description",
        Text,
        nullable=True,
        comment="Detailed description of the SKU",
    )
    Category: Mapped[str] = mapped_column(
        "Category",
        String(50),
        nullable=False,
        index=True,
        comment="SKU category (e.g., 'Hardware', 'Service', 'Travel')",
    )
    FixedPrice: Mapped[Decimal | None] = mapped_column(
        "FixedPrice",
        DECIMAL(10, 2),
        nullable=True,
        comment="Fixed price if applicable (NULL for calculated pricing)",
    )
    RequiresQuantity: Mapped[bool] = mapped_column(
        "RequiresQuantity",
        Boolean,
        default=True,
        server_default="true",
        nullable=False,
        comment="True if quantity is required for this SKU",
    )
    RequiresTravelZone: Mapped[bool] = mapped_column(
        "RequiresTravelZone",
        Boolean,
        default=False,
        server_default="false",
        nullable=False,
        comment="True if travel zone selection is required",
    )
    RequiresConfiguration: Mapped[bool] = mapped_column(
        "RequiresConfiguration",
        Boolean,
        default=False,
        server_default="false",
        nullable=False,
        comment="True if additional configuration is required",
    )
    IsActive: Mapped[bool] = mapped_column(
        "IsActive",
        Boolean,
        default=True,
        server_default="true",
        nullable=False,
        comment="False if SKU is discontinued",
    )
    SortOrder: Mapped[int] = mapped_column(
        "SortOrder",
        nullable=False,
        default=0,
        server_default="0",
        comment="Display order for UI",
    )
    EarmarkedStatus: Mapped[bool] = mapped_column(
        "EarmarkedStatus",
        Boolean,
        default=False,
        server_default="false",
        nullable=False,
        comment="True if pricing is subject to change during project refinement",
    )
    EstimatedHours: Mapped[int | None] = mapped_column(
        "EstimatedHours",
        nullable=True,
        comment="Estimated hours for this SKU (NULL for TBD)",
    )
    AcceptanceCriteria: Mapped[str | None] = mapped_column(
        "AcceptanceCriteria",
        Text,
        nullable=True,
        comment="Acceptance criteria for deliverable completion",
    )
    ScopeDescription: Mapped[str | None] = mapped_column(
        "ScopeDescription",
        Text,
        nullable=True,
        comment="What's included in this SKU (for Implementation Plan)",
    )
    Deliverables: Mapped[dict[str, Any] | None] = mapped_column(
        "Deliverables",
        JSON,
        nullable=True,
        comment="List of specific deliverables as JSON array",
    )
    TypicalDuration: Mapped[int | None] = mapped_column(
        "TypicalDuration",
        Integer,
        nullable=True,
        comment="Typical duration in weeks (for schedule building)",
    )
    QuickbooksCategory: Mapped[str | None] = mapped_column(
        "QuickbooksCategory",
        String(100),
        nullable=True,
        comment="Category/account code for Quickbooks",
    )
    Dependencies: Mapped[dict[str, Any] | None] = mapped_column(
        "Dependencies",
        JSON,
        nullable=True,
        comment="Required prerequisite SKUs as JSON array of SKU IDs",
    )
    IsRepeatable: Mapped[bool] = mapped_column(
        "IsRepeatable",
        Boolean,
        default=False,
        server_default="false",
        nullable=False,
        comment="Can be added multiple times (e.g., integrations)",
    )
    CreatedAt: Mapped[datetime] = mapped_column(
        "CreatedAt",
        server_default=func.now(),
        nullable=False,
        comment="Timestamp when SKU was created",
    )
    UpdatedAt: Mapped[datetime] = mapped_column(
        "UpdatedAt",
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="Timestamp when SKU was last updated",
    )

    def __repr__(self) -> str:
        """String representation."""
        return f"<SKUDefinition(code={self.SKUCode}, name={self.Name})>"
