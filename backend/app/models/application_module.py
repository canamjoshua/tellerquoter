"""Application Module models for parameter-driven quoting."""

from datetime import datetime
from typing import Any
from uuid import UUID as UUIDType
from uuid import uuid4

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class ApplicationModule(Base):  # type: ignore[misc]
    """
    Application modules for parameter-driven quote building.

    Represents modules like Check Recognition, Revenue Submission, Teller Online, etc.
    Each module has configuration parameters that determine which SKUs and SaaS products to include.
    """

    __tablename__ = "ApplicationModules"

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
    ModuleCode: Mapped[str] = mapped_column(
        "ModuleCode",
        String(50),
        nullable=False,
        index=True,
        comment="Unique module identifier (e.g., CHECK_RECOGNITION, REVENUE_SUBMISSION)",
    )
    ModuleName: Mapped[str] = mapped_column(
        "ModuleName",
        String(255),
        nullable=False,
        comment="Display name for module",
    )
    Description: Mapped[str | None] = mapped_column(
        "Description",
        Text,
        nullable=True,
        comment="Description of the module",
    )
    SaaSProductId: Mapped[UUIDType | None] = mapped_column(
        "SaaSProductId",
        UUID(as_uuid=True),
        ForeignKey("SaaSProducts.Id", ondelete="SET NULL"),
        nullable=True,
        comment="Link to SaaS product for this module (if applicable)",
    )
    RequiredSKUs: Mapped[dict[str, Any] | None] = mapped_column(
        "RequiredSKUs",
        JSON,
        nullable=True,
        comment="Auto-add these SKUs when module enabled (array of SKU IDs)",
    )
    SubParameters: Mapped[dict[str, Any] | None] = mapped_column(
        "SubParameters",
        JSON,
        nullable=True,
        comment="Configuration questions/parameters for this module",
    )
    SelectionRules: Mapped[dict[str, Any] | None] = mapped_column(
        "SelectionRules",
        JSON,
        nullable=True,
        comment="Rules for determining which SKUs based on sub-parameter values",
    )
    IsActive: Mapped[bool] = mapped_column(
        "IsActive",
        Boolean,
        default=True,
        server_default="true",
        nullable=False,
        comment="False if module is discontinued",
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
    )
    UpdatedAt: Mapped[datetime] = mapped_column(
        "UpdatedAt",
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        """String representation."""
        return f"<ApplicationModule(code={self.ModuleCode}, name={self.ModuleName})>"
