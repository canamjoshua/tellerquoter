"""Referrer models - PascalCase table names AND columns."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID as UUIDType
from uuid import uuid4

from sqlalchemy import DECIMAL, Boolean, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class Referrer(Base):  # type: ignore[misc]
    """
    Referrers table.

    Stores list of referrers (partners/affiliates) and their commission rates.
    Used for calculating referral fees on quotes.
    """

    __tablename__ = "Referrers"

    Id: Mapped[UUIDType] = mapped_column(
        "Id",
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=func.gen_random_uuid(),
    )
    ReferrerName: Mapped[str] = mapped_column(
        "ReferrerName",
        String(255),
        nullable=False,
        index=True,
        comment="Name of the referrer/partner",
    )
    StandardRate: Mapped[Decimal] = mapped_column(
        "StandardRate",
        DECIMAL(5, 2),
        nullable=False,
        comment="Standard commission rate as percentage (e.g., 5.00 for 5%)",
    )
    IsActive: Mapped[bool] = mapped_column(
        "IsActive",
        Boolean,
        default=True,
        server_default="true",
        nullable=False,
        comment="False if referrer is no longer active",
    )
    CreatedAt: Mapped[datetime] = mapped_column(
        "CreatedAt",
        server_default=func.now(),
        nullable=False,
        comment="Timestamp when referrer was added",
    )
    UpdatedAt: Mapped[datetime] = mapped_column(
        "UpdatedAt",
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="Timestamp when referrer was last updated",
    )

    def __repr__(self) -> str:
        """String representation."""
        return f"<Referrer(name={self.ReferrerName}, rate={self.StandardRate}%)>"
