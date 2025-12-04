"""API endpoints for SaaS product management."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.models import PricingVersion, SaaSProduct
from app.schemas import SaaSProductCreate, SaaSProductResponse, SaaSProductUpdate

router = APIRouter(prefix="/saas-products", tags=["saas"])


@router.get("/", response_model=list[SaaSProductResponse])
def list_saas_products(
    pricing_version_id: UUID | None = None,
    category: str | None = None,
    is_active: bool | None = None,
    is_required: bool | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
) -> list[SaaSProduct]:
    """List all SaaS products with optional filtering.

    Args:
        pricing_version_id: Filter by pricing version
        category: Filter by category
        is_active: Filter by active status
        is_required: Filter by required status
        skip: Number of records to skip
        limit: Maximum number of records to return
        db: Database session

    Returns:
        List of SaaS products
    """
    query = db.query(SaaSProduct)

    if pricing_version_id:
        query = query.filter(SaaSProduct.PricingVersionId == pricing_version_id)
    if category:
        query = query.filter(SaaSProduct.Category == category)
    if is_active is not None:
        query = query.filter(SaaSProduct.IsActive == is_active)
    if is_required is not None:
        query = query.filter(SaaSProduct.IsRequired == is_required)

    products = (
        query.order_by(SaaSProduct.SortOrder, SaaSProduct.Name).offset(skip).limit(limit).all()
    )
    return products


@router.get("/{product_id}", response_model=SaaSProductResponse)
def get_saas_product(product_id: UUID, db: Session = Depends(get_db)) -> SaaSProduct:
    """Get a specific SaaS product by ID.

    Args:
        product_id: UUID of the SaaS product
        db: Database session

    Returns:
        SaaS product

    Raises:
        HTTPException: If product not found
    """
    product = db.query(SaaSProduct).filter(SaaSProduct.Id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SaaS product not found")
    return product


@router.post("/", response_model=SaaSProductResponse, status_code=status.HTTP_201_CREATED)
def create_saas_product(
    product_data: SaaSProductCreate,
    db: Session = Depends(get_db),
) -> SaaSProduct:
    """Create a new SaaS product.

    Args:
        product_data: SaaS product data
        db: Database session

    Returns:
        Created SaaS product

    Raises:
        HTTPException: If pricing version not found or is locked,
                      or if product code already exists in that version
    """
    # Verify pricing version exists and is not locked
    pricing_version = (
        db.query(PricingVersion).filter(PricingVersion.Id == product_data.PricingVersionId).first()
    )
    if not pricing_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pricing version not found",
        )
    if pricing_version.IsLocked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add product to locked pricing version",
        )

    # Check if product code already exists in this pricing version
    existing = (
        db.query(SaaSProduct)
        .filter(
            SaaSProduct.PricingVersionId == product_data.PricingVersionId,
            SaaSProduct.ProductCode == product_data.ProductCode,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product code {product_data.ProductCode} already exists in this pricing version",
        )

    # Create new product
    product = SaaSProduct(**product_data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.patch("/{product_id}", response_model=SaaSProductResponse)
def update_saas_product(
    product_id: UUID,
    product_data: SaaSProductUpdate,
    db: Session = Depends(get_db),
) -> SaaSProduct:
    """Update a SaaS product.

    Args:
        product_id: UUID of the SaaS product
        product_data: Updated SaaS product data
        db: Database session

    Returns:
        Updated SaaS product

    Raises:
        HTTPException: If product not found or pricing version is locked
    """
    product = db.query(SaaSProduct).filter(SaaSProduct.Id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SaaS product not found",
        )

    # Check if pricing version is locked
    pricing_version = (
        db.query(PricingVersion).filter(PricingVersion.Id == product.PricingVersionId).first()
    )
    if pricing_version and pricing_version.IsLocked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update product in locked pricing version",
        )

    # Update product
    update_data = product_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saas_product(product_id: UUID, db: Session = Depends(get_db)) -> None:
    """Delete a SaaS product.

    Args:
        product_id: UUID of the SaaS product
        db: Database session

    Raises:
        HTTPException: If product not found, pricing version is locked, or has dependencies
    """
    product = db.query(SaaSProduct).filter(SaaSProduct.Id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SaaS product not found",
        )

    # Check if pricing version is locked
    pricing_version = (
        db.query(PricingVersion).filter(PricingVersion.Id == product.PricingVersionId).first()
    )
    if pricing_version and pricing_version.IsLocked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete product from locked pricing version",
        )

    try:
        db.delete(product)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete SaaS product with existing dependencies",
        ) from e
