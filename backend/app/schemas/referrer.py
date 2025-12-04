"""Pydantic schemas for referrers."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class ReferrerBase(BaseModel):
    """Base schema for referrer."""

    ReferrerName: str = Field(..., max_length=255, description="Name of the referrer")
    StandardRate: Decimal = Field(..., description="Standard referral rate/commission")
    IsActive: bool = Field(default=True, description="False if referrer is discontinued")


class ReferrerCreate(ReferrerBase):
    """Schema for creating a new referrer."""

    pass


class ReferrerUpdate(BaseModel):
    """Schema for updating a referrer."""

    ReferrerName: str | None = Field(None, max_length=255, description="Name of the referrer")
    StandardRate: Decimal | None = Field(None, description="Standard referral rate/commission")
    IsActive: bool | None = Field(None, description="False if referrer is discontinued")


class ReferrerResponse(ReferrerBase):
    """Schema for referrer response."""

    Id: UUID
    CreatedAt: datetime
    UpdatedAt: datetime

    class Config:
        from_attributes = True
