"""API endpoints for travel zone management."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.models import PricingVersion, TravelZone
from app.schemas import TravelZoneCreate, TravelZoneResponse, TravelZoneUpdate

router = APIRouter(prefix="/travel-zones", tags=["travel"])


@router.get("/", response_model=list[TravelZoneResponse])
def list_travel_zones(
    pricing_version_id: UUID | None = None,
    is_active: bool | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
) -> list[TravelZone]:
    """List all travel zones with optional filtering.

    Args:
        pricing_version_id: Filter by pricing version
        is_active: Filter by active status
        skip: Number of records to skip
        limit: Maximum number of records to return
        db: Database session

    Returns:
        List of travel zones
    """
    query = db.query(TravelZone)

    if pricing_version_id:
        query = query.filter(TravelZone.PricingVersionId == pricing_version_id)
    if is_active is not None:
        query = query.filter(TravelZone.IsActive == is_active)

    zones = query.order_by(TravelZone.SortOrder, TravelZone.Name).offset(skip).limit(limit).all()
    return zones


@router.get("/{zone_id}", response_model=TravelZoneResponse)
def get_travel_zone(zone_id: UUID, db: Session = Depends(get_db)) -> TravelZone:
    """Get a specific travel zone by ID.

    Args:
        zone_id: UUID of the travel zone
        db: Database session

    Returns:
        Travel zone

    Raises:
        HTTPException: If zone not found
    """
    zone = db.query(TravelZone).filter(TravelZone.Id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Travel zone not found")
    return zone


@router.post("/", response_model=TravelZoneResponse, status_code=status.HTTP_201_CREATED)
def create_travel_zone(
    zone_data: TravelZoneCreate,
    db: Session = Depends(get_db),
) -> TravelZone:
    """Create a new travel zone.

    Args:
        zone_data: Travel zone data
        db: Database session

    Returns:
        Created travel zone

    Raises:
        HTTPException: If pricing version not found or is locked,
                      or if zone code already exists in that version
    """
    # Verify pricing version exists and is not locked
    pricing_version = (
        db.query(PricingVersion).filter(PricingVersion.Id == zone_data.PricingVersionId).first()
    )
    if not pricing_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pricing version not found",
        )
    if pricing_version.IsLocked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add travel zone to locked pricing version",
        )

    # Check if zone code already exists in this pricing version
    existing = (
        db.query(TravelZone)
        .filter(
            TravelZone.PricingVersionId == zone_data.PricingVersionId,
            TravelZone.ZoneCode == zone_data.ZoneCode,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Zone code {zone_data.ZoneCode} already exists in this pricing version",
        )

    # Create new travel zone
    zone = TravelZone(**zone_data.model_dump())
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return zone


@router.patch("/{zone_id}", response_model=TravelZoneResponse)
def update_travel_zone(
    zone_id: UUID,
    zone_data: TravelZoneUpdate,
    db: Session = Depends(get_db),
) -> TravelZone:
    """Update a travel zone.

    Args:
        zone_id: UUID of the travel zone
        zone_data: Updated travel zone data
        db: Database session

    Returns:
        Updated travel zone

    Raises:
        HTTPException: If zone not found or pricing version is locked
    """
    zone = db.query(TravelZone).filter(TravelZone.Id == zone_id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Travel zone not found",
        )

    # Check if pricing version is locked
    pricing_version = (
        db.query(PricingVersion).filter(PricingVersion.Id == zone.PricingVersionId).first()
    )
    if pricing_version and pricing_version.IsLocked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update travel zone in locked pricing version",
        )

    # Update travel zone
    update_data = zone_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(zone, field, value)

    db.commit()
    db.refresh(zone)
    return zone


@router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_travel_zone(zone_id: UUID, db: Session = Depends(get_db)) -> None:
    """Delete a travel zone.

    Args:
        zone_id: UUID of the travel zone
        db: Database session

    Raises:
        HTTPException: If zone not found, pricing version is locked, or has dependencies
    """
    zone = db.query(TravelZone).filter(TravelZone.Id == zone_id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Travel zone not found",
        )

    # Check if pricing version is locked
    pricing_version = (
        db.query(PricingVersion).filter(PricingVersion.Id == zone.PricingVersionId).first()
    )
    if pricing_version and pricing_version.IsLocked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete travel zone from locked pricing version",
        )

    try:
        db.delete(zone)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete travel zone with existing dependencies",
        ) from e
