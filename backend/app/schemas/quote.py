"""Pydantic schemas for Quote and QuoteVersion."""

from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


# Quote Schemas
class QuoteBase(BaseModel):
    """Base schema for Quote."""

    ClientName: str = Field(..., max_length=255)
    ClientOrganization: str | None = Field(None, max_length=255)


class QuoteCreate(QuoteBase):
    """Schema for creating a new Quote."""

    CreatedBy: str = Field(..., max_length=255)


class QuoteUpdate(BaseModel):
    """Schema for updating a Quote."""

    ClientName: str | None = Field(None, max_length=255)
    ClientOrganization: str | None = Field(None, max_length=255)
    Status: str | None = Field(None, max_length=50)


class QuoteResponse(QuoteBase):
    """Schema for Quote response."""

    Id: UUID
    QuoteNumber: str
    CreatedBy: str
    CreatedAt: datetime
    UpdatedAt: datetime
    Status: str

    class Config:
        """Pydantic config."""

        from_attributes = True


# QuoteVersion Schemas
class QuoteVersionSaaSProductInput(BaseModel):
    """Input schema for SaaS product in quote."""

    SaaSProductId: UUID
    Quantity: Decimal = Field(..., ge=0)
    Notes: str | None = None


class QuoteVersionSetupPackageInput(BaseModel):
    """Input schema for setup package in quote."""

    SKUDefinitionId: UUID
    Quantity: int = Field(default=1, ge=1)
    CustomScopeNotes: str | None = None
    SequenceOrder: int | None = None


class QuoteVersionBase(BaseModel):
    """Base schema for QuoteVersion."""

    VersionDescription: str | None = None
    PricingVersionId: UUID
    ClientData: dict[str, Any]
    ProjectionYears: int = Field(default=5, ge=1, le=10)
    EscalationModel: str = Field(default="STANDARD_4PCT")
    MultiYearFreezeYears: int | None = None
    LevelLoadingEnabled: bool = False
    TellerPaymentsEnabled: bool = False
    DiscountConfig: dict[str, Any] | None = None
    ReferrerId: UUID | None = None
    ReferralRateOverride: Decimal | None = Field(None, ge=0, le=100)
    MilestoneStyle: str = Field(default="FIXED_MONTHLY")
    InitialPaymentPercentage: Decimal = Field(default=Decimal("25.00"), ge=0, le=100)
    ProjectDurationMonths: int = Field(default=10, ge=1)
    TravelZoneId: UUID | None = None
    TravelConfig: dict[str, Any] | None = None


class QuoteVersionCreate(QuoteVersionBase):
    """Schema for creating a new QuoteVersion."""

    QuoteId: UUID
    SaaSProducts: list[QuoteVersionSaaSProductInput] = Field(default_factory=list)
    SetupPackages: list[QuoteVersionSetupPackageInput] = Field(default_factory=list)
    CreatedBy: str = Field(..., max_length=255)


class QuoteVersionUpdate(BaseModel):
    """Schema for updating a QuoteVersion."""

    VersionDescription: str | None = None
    ClientData: dict[str, Any] | None = None
    ProjectionYears: int | None = Field(None, ge=1, le=10)
    EscalationModel: str | None = None
    MultiYearFreezeYears: int | None = None
    LevelLoadingEnabled: bool | None = None
    TellerPaymentsEnabled: bool | None = None
    DiscountConfig: dict[str, Any] | None = None
    ReferrerId: UUID | None = None
    ReferralRateOverride: Decimal | None = Field(None, ge=0, le=100)
    MilestoneStyle: str | None = None
    InitialPaymentPercentage: Decimal | None = Field(None, ge=0, le=100)
    ProjectDurationMonths: int | None = Field(None, ge=1)
    TravelZoneId: UUID | None = None
    TravelConfig: dict[str, Any] | None = None
    SaaSProducts: list[QuoteVersionSaaSProductInput] | None = None
    SetupPackages: list[QuoteVersionSetupPackageInput] | None = None
    VersionStatus: str | None = None


class QuoteVersionSaaSProductResponse(BaseModel):
    """Response schema for SaaS product in quote."""

    Id: UUID
    SaaSProductId: UUID
    Quantity: Decimal
    CalculatedMonthlyPrice: Decimal
    Notes: str | None

    class Config:
        """Pydantic config."""

        from_attributes = True


class QuoteVersionSetupPackageResponse(BaseModel):
    """Response schema for setup package in quote."""

    Id: UUID
    SKUDefinitionId: UUID
    Quantity: int
    CalculatedPrice: Decimal
    CustomScopeNotes: str | None
    SequenceOrder: int | None

    class Config:
        """Pydantic config."""

        from_attributes = True


class QuoteVersionResponse(QuoteVersionBase):
    """Schema for QuoteVersion response."""

    Id: UUID
    QuoteId: UUID
    VersionNumber: int
    TotalSaaSMonthly: Decimal | None
    TotalSaaSAnnualYear1: Decimal | None
    TotalSetupPackages: Decimal | None
    TotalTravel: Decimal | None
    TotalContractedAmount: Decimal | None
    CreatedBy: str
    CreatedAt: datetime
    VersionStatus: str
    SaaSProducts: list[QuoteVersionSaaSProductResponse] = Field(default_factory=list)
    SetupPackages: list[QuoteVersionSetupPackageResponse] = Field(default_factory=list)

    class Config:
        """Pydantic config."""

        from_attributes = True


class QuoteWithVersionsResponse(QuoteResponse):
    """Schema for Quote with all its versions."""

    versions: list[QuoteVersionResponse] = Field(default_factory=list)

    class Config:
        """Pydantic config."""

        from_attributes = True
