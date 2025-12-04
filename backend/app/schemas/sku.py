"""Pydantic schemas for SKU definitions."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class SKUDefinitionBase(BaseModel):
    """Base schema for SKU definition."""

    PricingVersionId: UUID = Field(..., description="Link to pricing version")
    SKUCode: str = Field(..., max_length=50, description="Unique SKU identifier (e.g., 'TT-100')")
    Name: str = Field(..., max_length=255, description="Display name for SKU")
    Description: str | None = Field(None, description="Detailed description of the SKU")
    Category: str = Field(
        ...,
        max_length=50,
        description="SKU category (e.g., 'Hardware', 'Service', 'Travel')",
    )
    FixedPrice: Decimal | None = Field(
        None, description="Fixed price if applicable (NULL for calculated pricing)"
    )
    RequiresQuantity: bool = Field(
        default=True, description="True if quantity is required for this SKU"
    )
    RequiresTravelZone: bool = Field(
        default=False, description="True if travel zone selection is required"
    )
    RequiresConfiguration: bool = Field(
        default=False, description="True if additional configuration is required"
    )
    IsActive: bool = Field(default=True, description="False if SKU is discontinued")
    SortOrder: int = Field(default=0, description="Display order for UI")


class SKUDefinitionCreate(SKUDefinitionBase):
    """Schema for creating a new SKU definition."""

    pass


class SKUDefinitionUpdate(BaseModel):
    """Schema for updating a SKU definition."""

    Name: str | None = Field(None, max_length=255, description="Display name for SKU")
    Description: str | None = Field(None, description="Detailed description of the SKU")
    Category: str | None = Field(None, max_length=50, description="SKU category")
    FixedPrice: Decimal | None = Field(None, description="Fixed price if applicable")
    RequiresQuantity: bool | None = Field(
        None, description="True if quantity is required for this SKU"
    )
    RequiresTravelZone: bool | None = Field(
        None, description="True if travel zone selection is required"
    )
    RequiresConfiguration: bool | None = Field(
        None, description="True if additional configuration is required"
    )
    IsActive: bool | None = Field(None, description="False if SKU is discontinued")
    SortOrder: int | None = Field(None, description="Display order for UI")


class SKUDefinitionResponse(SKUDefinitionBase):
    """Schema for SKU definition response."""

    Id: UUID
    CreatedAt: datetime
    UpdatedAt: datetime

    class Config:
        from_attributes = True
