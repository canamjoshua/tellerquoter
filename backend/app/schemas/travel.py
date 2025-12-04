"""Pydantic schemas for travel zones."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class TravelZoneBase(BaseModel):
    """Base schema for travel zone."""

    PricingVersionId: UUID = Field(..., description="Link to pricing version")
    ZoneCode: str = Field(..., max_length=50, description="Unique zone identifier (e.g., 'ZONE-A')")
    Name: str = Field(..., max_length=255, description="Display name for travel zone")
    Description: str | None = Field(None, description="Detailed description of the zone")
    MileageRate: Decimal = Field(..., description="Rate per mile for this zone")
    DailyRate: Decimal = Field(..., description="Daily rate for travel to this zone")
    AirfareRate: Decimal | None = Field(None, description="Standard airfare rate for this zone")
    HotelRate: Decimal | None = Field(None, description="Standard hotel rate per night")
    MealsRate: Decimal | None = Field(None, description="Standard meals rate per day")
    RentalCarRate: Decimal | None = Field(None, description="Standard rental car rate per day")
    ParkingRate: Decimal | None = Field(None, description="Standard parking rate per day")
    IsActive: bool = Field(default=True, description="False if zone is discontinued")
    SortOrder: int = Field(default=0, description="Display order for UI")


class TravelZoneCreate(TravelZoneBase):
    """Schema for creating a new travel zone."""

    pass


class TravelZoneUpdate(BaseModel):
    """Schema for updating a travel zone."""

    Name: str | None = Field(None, max_length=255, description="Display name for travel zone")
    Description: str | None = Field(None, description="Detailed description of the zone")
    MileageRate: Decimal | None = Field(None, description="Rate per mile for this zone")
    DailyRate: Decimal | None = Field(None, description="Daily rate for travel to this zone")
    AirfareRate: Decimal | None = Field(None, description="Standard airfare rate for this zone")
    HotelRate: Decimal | None = Field(None, description="Standard hotel rate per night")
    MealsRate: Decimal | None = Field(None, description="Standard meals rate per day")
    RentalCarRate: Decimal | None = Field(None, description="Standard rental car rate per day")
    ParkingRate: Decimal | None = Field(None, description="Standard parking rate per day")
    IsActive: bool | None = Field(None, description="False if zone is discontinued")
    SortOrder: int | None = Field(None, description="Display order for UI")


class TravelZoneResponse(TravelZoneBase):
    """Schema for travel zone response."""

    Id: UUID
    CreatedAt: datetime
    UpdatedAt: datetime

    class Config:
        from_attributes = True
