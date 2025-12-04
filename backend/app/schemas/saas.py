"""Pydantic schemas for SaaS products."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class SaaSProductBase(BaseModel):
    """Base schema for SaaS product."""

    PricingVersionId: UUID = Field(..., description="Link to pricing version")
    ProductCode: str = Field(
        ..., max_length=50, description="Unique product identifier (e.g., 'SAAS-001')"
    )
    Name: str = Field(..., max_length=255, description="Display name for SaaS product")
    Description: str | None = Field(None, description="Detailed description of the product")
    Category: str = Field(
        ..., max_length=50, description="Product category (e.g., 'Core', 'Optional')"
    )
    PricingModel: str = Field(
        ...,
        max_length=50,
        description="Pricing model type (e.g., 'Tiered', 'Flat')",
    )
    Tier1Min: int = Field(..., description="Minimum users for tier 1")
    Tier1Max: int = Field(..., description="Maximum users for tier 1")
    Tier1Price: Decimal = Field(..., description="Price per user for tier 1")
    Tier2Min: int | None = Field(None, description="Minimum users for tier 2")
    Tier2Max: int | None = Field(None, description="Maximum users for tier 2")
    Tier2Price: Decimal | None = Field(None, description="Price per user for tier 2")
    Tier3Min: int | None = Field(None, description="Minimum users for tier 3")
    Tier3Max: int | None = Field(None, description="Maximum users for tier 3 (null for unlimited)")
    Tier3Price: Decimal | None = Field(None, description="Price per user for tier 3")
    IsActive: bool = Field(default=True, description="False if product is discontinued")
    IsRequired: bool = Field(default=False, description="True if product is required in all quotes")
    SortOrder: int = Field(default=0, description="Display order for UI")


class SaaSProductCreate(SaaSProductBase):
    """Schema for creating a new SaaS product."""

    pass


class SaaSProductUpdate(BaseModel):
    """Schema for updating a SaaS product."""

    Name: str | None = Field(None, max_length=255, description="Display name for SaaS product")
    Description: str | None = Field(None, description="Detailed description of the product")
    Category: str | None = Field(None, max_length=50, description="Product category")
    PricingModel: str | None = Field(None, max_length=50, description="Pricing model type")
    Tier1Min: int | None = Field(None, description="Minimum users for tier 1")
    Tier1Max: int | None = Field(None, description="Maximum users for tier 1")
    Tier1Price: Decimal | None = Field(None, description="Price per user for tier 1")
    Tier2Min: int | None = Field(None, description="Minimum users for tier 2")
    Tier2Max: int | None = Field(None, description="Maximum users for tier 2")
    Tier2Price: Decimal | None = Field(None, description="Price per user for tier 2")
    Tier3Min: int | None = Field(None, description="Minimum users for tier 3")
    Tier3Max: int | None = Field(None, description="Maximum users for tier 3")
    Tier3Price: Decimal | None = Field(None, description="Price per user for tier 3")
    IsActive: bool | None = Field(None, description="False if product is discontinued")
    IsRequired: bool | None = Field(None, description="True if product is required in all quotes")
    SortOrder: int | None = Field(None, description="Display order for UI")


class SaaSProductResponse(SaaSProductBase):
    """Schema for SaaS product response."""

    Id: UUID
    CreatedAt: datetime
    UpdatedAt: datetime

    class Config:
        from_attributes = True
