"""Pydantic schemas for pricing version endpoints."""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field


class PricingVersionBase(BaseModel):
    """Base schema for pricing version."""

    VersionNumber: str = Field(
        ..., max_length=20, description="Version identifier (e.g., '2025.1')"
    )
    Description: str | None = Field(None, description="Description of changes in this version")
    EffectiveDate: date = Field(..., description="Date when this pricing becomes effective")
    ExpirationDate: date | None = Field(None, description="Date when this pricing expires")
    CreatedBy: str = Field(..., max_length=255, description="User who created this version")


class PricingVersionCreate(PricingVersionBase):
    """Schema for creating a new pricing version."""

    IsCurrent: bool = Field(default=False, description="True if this is the current active version")
    IsLocked: bool = Field(default=False, description="True if version is locked")


class PricingVersionUpdate(BaseModel):
    """Schema for updating a pricing version."""

    Description: str | None = None
    ExpirationDate: date | None = None
    IsCurrent: bool | None = None
    IsLocked: bool | None = None


class PricingVersionResponse(PricingVersionBase):
    """Schema for pricing version response."""

    Id: UUID
    CreatedAt: datetime
    IsCurrent: bool
    IsLocked: bool

    class Config:
        """Pydantic config."""

        from_attributes = True
