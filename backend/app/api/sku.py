"""API endpoints for SKU definition management."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.models import PricingVersion, SKUDefinition
from app.schemas import SKUDefinitionCreate, SKUDefinitionResponse, SKUDefinitionUpdate

router = APIRouter(prefix="/sku-definitions", tags=["sku"])


@router.get("/", response_model=list[SKUDefinitionResponse])
def list_sku_definitions(
    pricing_version_id: UUID | None = None,
    category: str | None = None,
    is_active: bool | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
) -> list[SKUDefinition]:
    """List all SKU definitions with optional filtering.

    Args:
        pricing_version_id: Filter by pricing version
        category: Filter by category
        is_active: Filter by active status
        skip: Number of records to skip
        limit: Maximum number of records to return
        db: Database session

    Returns:
        List of SKU definitions
    """
    query = db.query(SKUDefinition)

    if pricing_version_id:
        query = query.filter(SKUDefinition.PricingVersionId == pricing_version_id)
    if category:
        query = query.filter(SKUDefinition.Category == category)
    if is_active is not None:
        query = query.filter(SKUDefinition.IsActive == is_active)

    skus = (
        query.order_by(SKUDefinition.SortOrder, SKUDefinition.Name).offset(skip).limit(limit).all()
    )
    return skus


@router.get("/{sku_id}", response_model=SKUDefinitionResponse)
def get_sku_definition(sku_id: UUID, db: Session = Depends(get_db)) -> SKUDefinition:
    """Get a specific SKU definition by ID.

    Args:
        sku_id: UUID of the SKU definition
        db: Database session

    Returns:
        SKU definition

    Raises:
        HTTPException: If SKU not found
    """
    sku = db.query(SKUDefinition).filter(SKUDefinition.Id == sku_id).first()
    if not sku:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="SKU definition not found"
        )
    return sku


@router.post("/", response_model=SKUDefinitionResponse, status_code=status.HTTP_201_CREATED)
def create_sku_definition(
    sku_data: SKUDefinitionCreate,
    db: Session = Depends(get_db),
) -> SKUDefinition:
    """Create a new SKU definition.

    Args:
        sku_data: SKU definition data
        db: Database session

    Returns:
        Created SKU definition

    Raises:
        HTTPException: If pricing version not found or is locked,
                      or if SKU code already exists in that version
    """
    # Verify pricing version exists and is not locked
    pricing_version = (
        db.query(PricingVersion).filter(PricingVersion.Id == sku_data.PricingVersionId).first()
    )
    if not pricing_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pricing version not found",
        )
    if pricing_version.IsLocked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add SKU to locked pricing version",
        )

    # Check if SKU code already exists in this pricing version
    existing = (
        db.query(SKUDefinition)
        .filter(
            SKUDefinition.PricingVersionId == sku_data.PricingVersionId,
            SKUDefinition.SKUCode == sku_data.SKUCode,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"SKU code {sku_data.SKUCode} already exists in this pricing version",
        )

    # Create new SKU
    sku = SKUDefinition(**sku_data.model_dump())
    db.add(sku)
    db.commit()
    db.refresh(sku)
    return sku


@router.patch("/{sku_id}", response_model=SKUDefinitionResponse)
def update_sku_definition(
    sku_id: UUID,
    sku_data: SKUDefinitionUpdate,
    db: Session = Depends(get_db),
) -> SKUDefinition:
    """Update a SKU definition.

    Args:
        sku_id: UUID of the SKU definition
        sku_data: Updated SKU definition data
        db: Database session

    Returns:
        Updated SKU definition

    Raises:
        HTTPException: If SKU not found or pricing version is locked
    """
    sku = db.query(SKUDefinition).filter(SKUDefinition.Id == sku_id).first()
    if not sku:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SKU definition not found",
        )

    # Check if pricing version is locked
    pricing_version = (
        db.query(PricingVersion).filter(PricingVersion.Id == sku.PricingVersionId).first()
    )
    if pricing_version and pricing_version.IsLocked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update SKU in locked pricing version",
        )

    # Update SKU
    update_data = sku_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(sku, field, value)

    db.commit()
    db.refresh(sku)
    return sku


@router.delete("/{sku_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sku_definition(sku_id: UUID, db: Session = Depends(get_db)) -> None:
    """Delete a SKU definition.

    Args:
        sku_id: UUID of the SKU definition
        db: Database session

    Raises:
        HTTPException: If SKU not found, pricing version is locked, or has dependencies
    """
    sku = db.query(SKUDefinition).filter(SKUDefinition.Id == sku_id).first()
    if not sku:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SKU definition not found",
        )

    # Check if pricing version is locked
    pricing_version = (
        db.query(PricingVersion).filter(PricingVersion.Id == sku.PricingVersionId).first()
    )
    if pricing_version and pricing_version.IsLocked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete SKU from locked pricing version",
        )

    try:
        db.delete(sku)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete SKU definition with existing dependencies",
        ) from e
