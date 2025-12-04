"""API endpoints for pricing version management."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.models import PricingVersion
from app.schemas import PricingVersionCreate, PricingVersionResponse, PricingVersionUpdate

router = APIRouter(prefix="/pricing-versions", tags=["pricing"])


@router.get("/", response_model=list[PricingVersionResponse])
def list_pricing_versions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
) -> list[PricingVersion]:
    """List all pricing versions.

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        db: Database session

    Returns:
        List of pricing versions
    """
    versions = (
        db.query(PricingVersion)
        .order_by(PricingVersion.CreatedAt.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return versions


@router.get("/current", response_model=PricingVersionResponse)
def get_current_pricing_version(db: Session = Depends(get_db)) -> PricingVersion:
    """Get the current active pricing version.

    Args:
        db: Database session

    Returns:
        Current pricing version

    Raises:
        HTTPException: If no current version exists
    """
    version = db.query(PricingVersion).filter(PricingVersion.IsCurrent).first()
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No current pricing version found"
        )
    return version


@router.get("/{version_id}", response_model=PricingVersionResponse)
def get_pricing_version(version_id: UUID, db: Session = Depends(get_db)) -> PricingVersion:
    """Get a specific pricing version by ID.

    Args:
        version_id: UUID of the pricing version
        db: Database session

    Returns:
        Pricing version

    Raises:
        HTTPException: If version not found
    """
    version = db.query(PricingVersion).filter(PricingVersion.Id == version_id).first()
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Pricing version not found"
        )
    return version


@router.post("/", response_model=PricingVersionResponse, status_code=status.HTTP_201_CREATED)
def create_pricing_version(
    version_data: PricingVersionCreate,
    db: Session = Depends(get_db),
) -> PricingVersion:
    """Create a new pricing version.

    Args:
        version_data: Pricing version data
        db: Database session

    Returns:
        Created pricing version

    Raises:
        HTTPException: If version number already exists
    """
    # Check if version number already exists
    existing = (
        db.query(PricingVersion)
        .filter(PricingVersion.VersionNumber == version_data.VersionNumber)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Version number {version_data.VersionNumber} already exists",
        )

    # If setting as current, unset any existing current version
    if version_data.IsCurrent:
        db.query(PricingVersion).filter(PricingVersion.IsCurrent).update({"IsCurrent": False})

    # Create new version
    version = PricingVersion(**version_data.model_dump())
    db.add(version)
    db.commit()
    db.refresh(version)
    return version


@router.patch("/{version_id}", response_model=PricingVersionResponse)
def update_pricing_version(
    version_id: UUID,
    version_data: PricingVersionUpdate,
    db: Session = Depends(get_db),
) -> PricingVersion:
    """Update a pricing version.

    Args:
        version_id: UUID of the pricing version
        version_data: Updated pricing version data
        db: Database session

    Returns:
        Updated pricing version

    Raises:
        HTTPException: If version not found or is locked
    """
    version = db.query(PricingVersion).filter(PricingVersion.Id == version_id).first()
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Pricing version not found"
        )

    # Prevent updates to locked versions (except to unlock them)
    if version.IsLocked and version_data.IsLocked is not False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot update locked pricing version"
        )

    # If setting as current, unset any existing current version
    if version_data.IsCurrent is True:
        db.query(PricingVersion).filter(PricingVersion.IsCurrent).update({"IsCurrent": False})

    # Update version
    update_data = version_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(version, field, value)

    db.commit()
    db.refresh(version)
    return version


@router.delete("/{version_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pricing_version(version_id: UUID, db: Session = Depends(get_db)) -> None:
    """Delete a pricing version.

    Args:
        version_id: UUID of the pricing version
        db: Database session

    Raises:
        HTTPException: If version not found, is locked, or has dependencies
    """
    version = db.query(PricingVersion).filter(PricingVersion.Id == version_id).first()
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Pricing version not found"
        )

    if version.IsLocked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete locked pricing version"
        )

    try:
        db.delete(version)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete pricing version with existing dependencies",
        ) from e
