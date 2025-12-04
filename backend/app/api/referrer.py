"""API endpoints for referrer management."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.models import Referrer
from app.schemas import ReferrerCreate, ReferrerResponse, ReferrerUpdate

router = APIRouter(prefix="/referrers", tags=["referrer"])


@router.get("/", response_model=list[ReferrerResponse])
def list_referrers(
    is_active: bool | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
) -> list[Referrer]:
    """List all referrers with optional filtering.

    Args:
        is_active: Filter by active status
        skip: Number of records to skip
        limit: Maximum number of records to return
        db: Database session

    Returns:
        List of referrers
    """
    query = db.query(Referrer)

    if is_active is not None:
        query = query.filter(Referrer.IsActive == is_active)

    referrers = query.order_by(Referrer.ReferrerName).offset(skip).limit(limit).all()
    return referrers


@router.get("/{referrer_id}", response_model=ReferrerResponse)
def get_referrer(referrer_id: UUID, db: Session = Depends(get_db)) -> Referrer:
    """Get a specific referrer by ID.

    Args:
        referrer_id: UUID of the referrer
        db: Database session

    Returns:
        Referrer

    Raises:
        HTTPException: If referrer not found
    """
    referrer = db.query(Referrer).filter(Referrer.Id == referrer_id).first()
    if not referrer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Referrer not found")
    return referrer


@router.post("/", response_model=ReferrerResponse, status_code=status.HTTP_201_CREATED)
def create_referrer(
    referrer_data: ReferrerCreate,
    db: Session = Depends(get_db),
) -> Referrer:
    """Create a new referrer.

    Args:
        referrer_data: Referrer data
        db: Database session

    Returns:
        Created referrer

    Raises:
        HTTPException: If referrer name already exists
    """
    # Check if referrer name already exists
    existing = (
        db.query(Referrer).filter(Referrer.ReferrerName == referrer_data.ReferrerName).first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Referrer {referrer_data.ReferrerName} already exists",
        )

    # Create new referrer
    referrer = Referrer(**referrer_data.model_dump())
    db.add(referrer)
    db.commit()
    db.refresh(referrer)
    return referrer


@router.patch("/{referrer_id}", response_model=ReferrerResponse)
def update_referrer(
    referrer_id: UUID,
    referrer_data: ReferrerUpdate,
    db: Session = Depends(get_db),
) -> Referrer:
    """Update a referrer.

    Args:
        referrer_id: UUID of the referrer
        referrer_data: Updated referrer data
        db: Database session

    Returns:
        Updated referrer

    Raises:
        HTTPException: If referrer not found
    """
    referrer = db.query(Referrer).filter(Referrer.Id == referrer_id).first()
    if not referrer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referrer not found",
        )

    # Update referrer
    update_data = referrer_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(referrer, field, value)

    db.commit()
    db.refresh(referrer)
    return referrer


@router.delete("/{referrer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_referrer(referrer_id: UUID, db: Session = Depends(get_db)) -> None:
    """Delete a referrer.

    Args:
        referrer_id: UUID of the referrer
        db: Database session

    Raises:
        HTTPException: If referrer not found or has dependencies
    """
    referrer = db.query(Referrer).filter(Referrer.Id == referrer_id).first()
    if not referrer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referrer not found",
        )

    try:
        db.delete(referrer)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete referrer with existing dependencies",
        ) from e
