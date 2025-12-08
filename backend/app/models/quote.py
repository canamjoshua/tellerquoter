"""Quote and QuoteVersion models."""

from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID as UUIDType
from uuid import uuid4

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Quote(Base):  # type: ignore[misc]
    """
    Quote parent record tracking quote number and client.

    Each quote can have multiple versions.
    """

    __tablename__ = "Quotes"

    Id: Mapped[UUIDType] = mapped_column(
        "Id",
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=func.gen_random_uuid(),
    )
    QuoteNumber: Mapped[str] = mapped_column(
        "QuoteNumber",
        String(50),
        unique=True,
        nullable=False,
        index=True,
        comment="Quote number, e.g. Q-2025-0001",
    )
    ClientName: Mapped[str] = mapped_column(
        "ClientName",
        String(255),
        nullable=False,
        index=True,
        comment="Client organization name",
    )
    ClientOrganization: Mapped[str | None] = mapped_column(
        "ClientOrganization",
        String(255),
        nullable=True,
        comment="Client organization type/details",
    )
    CreatedBy: Mapped[str] = mapped_column(
        "CreatedBy",
        String(255),
        nullable=False,
        index=True,
        comment="User who created the quote",
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
    Status: Mapped[str] = mapped_column(
        "Status",
        String(50),
        default="DRAFT",
        nullable=False,
        comment="DRAFT, SENT, ACCEPTED, DECLINED",
    )

    # Relationships
    versions: Mapped[list["QuoteVersion"]] = relationship(
        "QuoteVersion",
        back_populates="quote",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        """String representation."""
        return f"<Quote({self.QuoteNumber} - {self.ClientName})>"


class QuoteVersion(Base):  # type: ignore[misc]
    """
    Quote version with all configuration and calculated totals.

    Each version represents a snapshot of the quote at a point in time.
    """

    __tablename__ = "QuoteVersions"

    Id: Mapped[UUIDType] = mapped_column(
        "Id",
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=func.gen_random_uuid(),
    )
    QuoteId: Mapped[UUIDType] = mapped_column(
        "QuoteId",
        UUID(as_uuid=True),
        ForeignKey("Quotes.Id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    VersionNumber: Mapped[int] = mapped_column(
        "VersionNumber",
        Integer,
        nullable=False,
        comment="Sequential version number: 1, 2, 3...",
    )
    VersionDescription: Mapped[str | None] = mapped_column(
        "VersionDescription",
        Text,
        nullable=True,
        comment="Description of changes in this version",
    )
    PricingVersionId: Mapped[UUIDType] = mapped_column(
        "PricingVersionId",
        UUID(as_uuid=True),
        ForeignKey("PricingVersions.Id"),
        nullable=False,
        index=True,
    )

    # Client Information (JSONB)
    ClientData: Mapped[dict[str, Any]] = mapped_column(
        "ClientData",
        JSON,
        nullable=False,
        comment="Client details: name, address, contacts, population, location",
    )

    # Quote Configuration
    ProjectionYears: Mapped[int] = mapped_column(
        "ProjectionYears",
        Integer,
        default=5,
        nullable=False,
    )
    EscalationModel: Mapped[str] = mapped_column(
        "EscalationModel",
        String(50),
        default="STANDARD_4PCT",
        nullable=False,
        comment="STANDARD_4PCT, CPI, MULTI_YEAR_FREEZE",
    )
    MultiYearFreezeYears: Mapped[int | None] = mapped_column(
        "MultiYearFreezeYears",
        Integer,
        nullable=True,
    )
    LevelLoadingEnabled: Mapped[bool] = mapped_column(
        "LevelLoadingEnabled",
        default=False,
        nullable=False,
    )
    TellerPaymentsEnabled: Mapped[bool] = mapped_column(
        "TellerPaymentsEnabled",
        default=False,
        nullable=False,
    )

    # Discounts (JSONB)
    DiscountConfig: Mapped[dict[str, Any] | None] = mapped_column(
        "DiscountConfig",
        JSON,
        nullable=True,
        comment="Discount configuration: saas_year1_pct, saas_all_years_pct, setup_fixed, setup_pct",
    )

    # Referral
    ReferrerId: Mapped[UUIDType | None] = mapped_column(
        "ReferrerId",
        UUID(as_uuid=True),
        ForeignKey("Referrers.Id"),
        nullable=True,
    )
    ReferralRateOverride: Mapped[Decimal | None] = mapped_column(
        "ReferralRateOverride",
        nullable=True,
    )

    # Implementation Plan Config
    MilestoneStyle: Mapped[str] = mapped_column(
        "MilestoneStyle",
        String(50),
        default="FIXED_MONTHLY",
        nullable=False,
        comment="FIXED_MONTHLY, DELIVERABLE_BASED",
    )
    InitialPaymentPercentage: Mapped[Decimal] = mapped_column(
        "InitialPaymentPercentage",
        default=Decimal("25.00"),
        nullable=False,
    )
    ProjectDurationMonths: Mapped[int] = mapped_column(
        "ProjectDurationMonths",
        Integer,
        default=10,
        nullable=False,
    )

    # Travel
    TravelZoneId: Mapped[UUIDType | None] = mapped_column(
        "TravelZoneId",
        UUID(as_uuid=True),
        ForeignKey("TravelZones.Id"),
        nullable=True,
    )
    TravelConfig: Mapped[dict[str, Any] | None] = mapped_column(
        "TravelConfig",
        JSON,
        nullable=True,
        comment="Array of trips with days, people, overrides",
    )

    # Totals (calculated/cached)
    TotalSaaSMonthly: Mapped[Decimal | None] = mapped_column(
        "TotalSaaSMonthly",
        nullable=True,
    )
    TotalSaaSAnnualYear1: Mapped[Decimal | None] = mapped_column(
        "TotalSaaSAnnualYear1",
        nullable=True,
    )
    TotalSetupPackages: Mapped[Decimal | None] = mapped_column(
        "TotalSetupPackages",
        nullable=True,
    )
    TotalTravel: Mapped[Decimal | None] = mapped_column(
        "TotalTravel",
        nullable=True,
    )
    TotalContractedAmount: Mapped[Decimal | None] = mapped_column(
        "TotalContractedAmount",
        nullable=True,
    )

    CreatedBy: Mapped[str] = mapped_column(
        "CreatedBy",
        String(255),
        nullable=False,
    )
    CreatedAt: Mapped[datetime] = mapped_column(
        "CreatedAt",
        server_default=func.now(),
        nullable=False,
    )
    VersionStatus: Mapped[str] = mapped_column(
        "VersionStatus",
        String(50),
        default="DRAFT",
        nullable=False,
        comment="DRAFT, SENT, ACCEPTED",
    )

    # Relationships
    quote: Mapped["Quote"] = relationship("Quote", back_populates="versions")
    saas_products: Mapped[list["QuoteVersionSaaSProduct"]] = relationship(
        "QuoteVersionSaaSProduct",
        back_populates="quote_version",
        cascade="all, delete-orphan",
    )
    setup_packages: Mapped[list["QuoteVersionSetupPackage"]] = relationship(
        "QuoteVersionSetupPackage",
        back_populates="quote_version",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        """String representation."""
        return f"<QuoteVersion({self.QuoteId} v{self.VersionNumber})>"


class QuoteVersionSaaSProduct(Base):  # type: ignore[misc]
    """SaaS product included in a quote version."""

    __tablename__ = "QuoteVersionSaaSProducts"

    Id: Mapped[UUIDType] = mapped_column(
        "Id",
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=func.gen_random_uuid(),
    )
    QuoteVersionId: Mapped[UUIDType] = mapped_column(
        "QuoteVersionId",
        UUID(as_uuid=True),
        ForeignKey("QuoteVersions.Id", ondelete="CASCADE"),
        nullable=False,
    )
    SaaSProductId: Mapped[UUIDType] = mapped_column(
        "SaaSProductId",
        UUID(as_uuid=True),
        ForeignKey("SaaSProducts.Id"),
        nullable=False,
    )
    Quantity: Mapped[Decimal] = mapped_column(
        "Quantity",
        nullable=False,
        comment="Volume input for tiered pricing",
    )
    CalculatedMonthlyPrice: Mapped[Decimal] = mapped_column(
        "CalculatedMonthlyPrice",
        nullable=False,
    )
    Notes: Mapped[str | None] = mapped_column(
        "Notes",
        Text,
        nullable=True,
    )

    # Relationships
    quote_version: Mapped["QuoteVersion"] = relationship(
        "QuoteVersion",
        back_populates="saas_products",
    )

    def __repr__(self) -> str:
        """String representation."""
        return f"<QuoteVersionSaaSProduct({self.QuoteVersionId} - {self.SaaSProductId})>"


class QuoteVersionSetupPackage(Base):  # type: ignore[misc]
    """Setup package (SKU) included in a quote version."""

    __tablename__ = "QuoteVersionSetupPackages"

    Id: Mapped[UUIDType] = mapped_column(
        "Id",
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=func.gen_random_uuid(),
    )
    QuoteVersionId: Mapped[UUIDType] = mapped_column(
        "QuoteVersionId",
        UUID(as_uuid=True),
        ForeignKey("QuoteVersions.Id", ondelete="CASCADE"),
        nullable=False,
    )
    SKUDefinitionId: Mapped[UUIDType] = mapped_column(
        "SKUDefinitionId",
        UUID(as_uuid=True),
        ForeignKey("SKUDefinitions.Id"),
        nullable=False,
    )
    Quantity: Mapped[int] = mapped_column(
        "Quantity",
        Integer,
        default=1,
        nullable=False,
    )
    CalculatedPrice: Mapped[Decimal] = mapped_column(
        "CalculatedPrice",
        nullable=False,
    )
    CustomScopeNotes: Mapped[str | None] = mapped_column(
        "CustomScopeNotes",
        Text,
        nullable=True,
    )
    SequenceOrder: Mapped[int | None] = mapped_column(
        "SequenceOrder",
        Integer,
        nullable=True,
    )

    # Relationships
    quote_version: Mapped["QuoteVersion"] = relationship(
        "QuoteVersion",
        back_populates="setup_packages",
    )

    def __repr__(self) -> str:
        """String representation."""
        return f"<QuoteVersionSetupPackage({self.QuoteVersionId} - {self.SKUDefinitionId})>"
