"""API endpoints for quote management."""

from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_db
from app.models import (
    PricingVersion,
    Quote,
    QuoteVersion,
    QuoteVersionSaaSProduct,
    QuoteVersionSetupPackage,
    SaaSProduct,
    SKUDefinition,
)
from app.schemas import (
    QuoteCreate,
    QuoteResponse,
    QuoteUpdate,
    QuoteVersionCreate,
    QuoteVersionResponse,
    QuoteVersionUpdate,
    QuoteWithVersionsResponse,
)

router = APIRouter(prefix="/quotes", tags=["quotes"])


def generate_quote_number(db: Session) -> str:
    """Generate next quote number in format Q-YYYY-NNNN."""
    from datetime import datetime

    year = datetime.now().year
    # Get highest quote number for current year
    prefix = f"Q-{year}-"
    last_quote = (
        db.query(Quote)
        .filter(Quote.QuoteNumber.startswith(prefix))
        .order_by(Quote.QuoteNumber.desc())
        .first()
    )

    if last_quote:
        # Extract number and increment
        last_num = int(last_quote.QuoteNumber.split("-")[-1])
        new_num = last_num + 1
    else:
        new_num = 1

    return f"{prefix}{new_num:04d}"


# Quote CRUD
@router.get("/", response_model=list[QuoteResponse])
def list_quotes(
    skip: int = 0,
    limit: int = 100,
    status: str | None = None,
    db: Session = Depends(get_db),
) -> list[Quote]:
    """List all quotes.

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        status: Filter by status (optional)
        db: Database session

    Returns:
        List of quotes
    """
    query = db.query(Quote)

    if status:
        query = query.filter(Quote.Status == status)

    quotes = query.order_by(Quote.UpdatedAt.desc()).offset(skip).limit(limit).all()
    return quotes


@router.get("/{quote_id}", response_model=QuoteWithVersionsResponse)
def get_quote(quote_id: UUID, db: Session = Depends(get_db)) -> Quote:
    """Get a specific quote with all its versions.

    Args:
        quote_id: UUID of the quote
        db: Database session

    Returns:
        Quote with all versions

    Raises:
        HTTPException: If quote not found
    """
    quote = (
        db.query(Quote)
        .options(
            joinedload(Quote.versions).joinedload(QuoteVersion.saas_products),
            joinedload(Quote.versions).joinedload(QuoteVersion.setup_packages),
        )
        .filter(Quote.Id == quote_id)
        .first()
    )
    if not quote:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")
    return quote


@router.post("/", response_model=QuoteResponse, status_code=status.HTTP_201_CREATED)
def create_quote(
    quote_data: QuoteCreate,
    db: Session = Depends(get_db),
) -> Quote:
    """Create a new quote with an initial version.

    Args:
        quote_data: Quote data
        db: Database session

    Returns:
        Created quote

    Raises:
        HTTPException: If no current pricing version exists
    """
    # Generate quote number
    quote_number = generate_quote_number(db)

    # Get current pricing version
    current_pricing = (
        db.query(PricingVersion).filter(PricingVersion.IsCurrent == True).first()  # noqa: E712
    )

    if not current_pricing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No current pricing version found. Please set a pricing version as current before creating quotes.",
        )

    # Create quote
    quote = Quote(
        QuoteNumber=quote_number,
        **quote_data.model_dump(),
    )
    db.add(quote)
    db.flush()  # Get quote ID for version creation

    # Create initial version with current pricing
    initial_version = QuoteVersion(
        QuoteId=quote.Id,
        VersionNumber=1,
        VersionDescription="Initial version",
        PricingVersionId=current_pricing.Id,
        ClientData={
            "ClientName": quote_data.ClientName,
            "ClientOrganization": quote_data.ClientOrganization or "",
        },
        ProjectionYears=5,
        EscalationModel="STANDARD_4PCT",
        LevelLoadingEnabled=False,
        TellerPaymentsEnabled=False,
        MilestoneStyle="FIXED_MONTHLY",
        InitialPaymentPercentage=Decimal("25.00"),
        ProjectDurationMonths=10,
        CreatedBy=quote_data.CreatedBy,
        VersionStatus="DRAFT",
    )
    db.add(initial_version)

    db.commit()
    db.refresh(quote)
    return quote


@router.patch("/{quote_id}", response_model=QuoteResponse)
def update_quote(
    quote_id: UUID,
    quote_data: QuoteUpdate,
    db: Session = Depends(get_db),
) -> Quote:
    """Update a quote.

    Args:
        quote_id: UUID of the quote
        quote_data: Updated quote data
        db: Database session

    Returns:
        Updated quote

    Raises:
        HTTPException: If quote not found
    """
    quote = db.query(Quote).filter(Quote.Id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")

    # Update fields
    update_data = quote_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(quote, field, value)

    db.commit()
    db.refresh(quote)
    return quote


@router.delete("/{quote_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quote(quote_id: UUID, db: Session = Depends(get_db)) -> None:
    """Delete a quote and all its versions.

    Args:
        quote_id: UUID of the quote
        db: Database session

    Raises:
        HTTPException: If quote not found
    """
    quote = db.query(Quote).filter(Quote.Id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")

    db.delete(quote)
    db.commit()


# QuoteVersion CRUD
@router.get("/{quote_id}/versions/", response_model=list[QuoteVersionResponse])
def list_quote_versions(
    quote_id: UUID,
    db: Session = Depends(get_db),
) -> list[QuoteVersion]:
    """List all versions of a quote.

    Args:
        quote_id: UUID of the quote
        db: Database session

    Returns:
        List of quote versions

    Raises:
        HTTPException: If quote not found
    """
    quote = db.query(Quote).filter(Quote.Id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")

    versions = (
        db.query(QuoteVersion)
        .options(
            joinedload(QuoteVersion.saas_products),
            joinedload(QuoteVersion.setup_packages),
        )
        .filter(QuoteVersion.QuoteId == quote_id)
        .order_by(QuoteVersion.VersionNumber.desc())
        .all()
    )
    return versions


@router.get("/{quote_id}/versions/{version_number}", response_model=QuoteVersionResponse)
def get_quote_version(
    quote_id: UUID,
    version_number: int,
    db: Session = Depends(get_db),
) -> QuoteVersion:
    """Get a specific version of a quote.

    Args:
        quote_id: UUID of the quote
        version_number: Version number
        db: Database session

    Returns:
        Quote version

    Raises:
        HTTPException: If version not found
    """
    version = (
        db.query(QuoteVersion)
        .options(
            joinedload(QuoteVersion.saas_products),
            joinedload(QuoteVersion.setup_packages),
        )
        .filter(
            QuoteVersion.QuoteId == quote_id,
            QuoteVersion.VersionNumber == version_number,
        )
        .first()
    )
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote version not found")
    return version


def calculate_saas_price(product: SaaSProduct, quantity: Decimal) -> Decimal:
    """Calculate monthly price based on tiered pricing.

    Args:
        product: SaaS product
        quantity: Quantity/volume

    Returns:
        Calculated monthly price
    """
    # Check each tier
    if product.Tier1Min and quantity >= product.Tier1Min:
        if not product.Tier1Max or quantity <= product.Tier1Max:
            return product.Tier1Price or Decimal("0")

    if product.Tier2Min and quantity >= product.Tier2Min:
        if not product.Tier2Max or quantity <= product.Tier2Max:
            return product.Tier2Price or Decimal("0")

    if product.Tier3Min and quantity >= product.Tier3Min:
        if not product.Tier3Max or quantity <= product.Tier3Max:
            return product.Tier3Price or Decimal("0")

    # Default to tier 1 price if no match
    return product.Tier1Price or Decimal("0")


@router.post(
    "/{quote_id}/versions/",
    response_model=QuoteVersionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_quote_version(
    quote_id: UUID,
    version_data: QuoteVersionCreate,
    db: Session = Depends(get_db),
) -> QuoteVersion:
    """Create a new version of a quote.

    Args:
        quote_id: UUID of the quote
        version_data: Quote version data
        db: Database session

    Returns:
        Created quote version

    Raises:
        HTTPException: If quote not found
    """
    # Verify quote exists
    quote = db.query(Quote).filter(Quote.Id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")

    # Get next version number
    last_version = (
        db.query(QuoteVersion)
        .filter(QuoteVersion.QuoteId == quote_id)
        .order_by(QuoteVersion.VersionNumber.desc())
        .first()
    )
    version_number = (last_version.VersionNumber + 1) if last_version else 1

    # Extract SaaS and Setup data before creating version
    saas_products_data = version_data.SaaSProducts
    setup_packages_data = version_data.SetupPackages

    # Create quote version (excluding lists)
    version_dict = version_data.model_dump(exclude={"QuoteId", "SaaSProducts", "SetupPackages"})
    version = QuoteVersion(
        QuoteId=quote_id,
        VersionNumber=version_number,
        **version_dict,
    )
    db.add(version)
    db.flush()  # Get version ID

    # Add SaaS products with calculated prices
    total_saas_monthly = Decimal("0")
    for saas_data in saas_products_data:
        # Get product to calculate price
        product = db.query(SaaSProduct).filter(SaaSProduct.Id == saas_data.SaaSProductId).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"SaaS product {saas_data.SaaSProductId} not found",
            )

        monthly_price = calculate_saas_price(product, saas_data.Quantity)
        total_saas_monthly += monthly_price

        quote_saas = QuoteVersionSaaSProduct(
            QuoteVersionId=version.Id,
            SaaSProductId=saas_data.SaaSProductId,
            Quantity=saas_data.Quantity,
            CalculatedMonthlyPrice=monthly_price,
            Notes=saas_data.Notes,
        )
        db.add(quote_saas)

    # Add setup packages with calculated prices
    total_setup = Decimal("0")
    for setup_data in setup_packages_data:
        # Get SKU to get fixed price
        sku = db.query(SKUDefinition).filter(SKUDefinition.Id == setup_data.SKUDefinitionId).first()
        if not sku:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"SKU {setup_data.SKUDefinitionId} not found",
            )

        calculated_price = (sku.FixedPrice or Decimal("0")) * setup_data.Quantity
        total_setup += calculated_price

        quote_setup = QuoteVersionSetupPackage(
            QuoteVersionId=version.Id,
            SKUDefinitionId=setup_data.SKUDefinitionId,
            Quantity=setup_data.Quantity,
            CalculatedPrice=calculated_price,
            CustomScopeNotes=setup_data.CustomScopeNotes,
            SequenceOrder=setup_data.SequenceOrder,
        )
        db.add(quote_setup)

    # Calculate and store totals
    version.TotalSaaSMonthly = total_saas_monthly
    version.TotalSaaSAnnualYear1 = total_saas_monthly * 12
    version.TotalSetupPackages = total_setup
    # Travel and contracted amount will be calculated separately

    db.commit()

    # Query version with eager loading
    version = (
        db.query(QuoteVersion)
        .options(
            joinedload(QuoteVersion.saas_products),
            joinedload(QuoteVersion.setup_packages),
        )
        .filter(QuoteVersion.Id == version.Id)
        .one()
    )

    return version


@router.patch(
    "/{quote_id}/versions/{version_number}",
    response_model=QuoteVersionResponse,
)
def update_quote_version(
    quote_id: UUID,
    version_number: int,
    version_data: QuoteVersionUpdate,
    db: Session = Depends(get_db),
) -> QuoteVersion:
    """Update a quote version.

    Args:
        quote_id: UUID of the quote
        version_number: Version number
        version_data: Updated version data
        db: Database session

    Returns:
        Updated quote version

    Raises:
        HTTPException: If version not found or is locked
    """
    version = (
        db.query(QuoteVersion)
        .filter(
            QuoteVersion.QuoteId == quote_id,
            QuoteVersion.VersionNumber == version_number,
        )
        .first()
    )
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote version not found")

    # Don't allow editing sent/accepted versions
    if version.VersionStatus in ["SENT", "ACCEPTED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot edit {version.VersionStatus.lower()} version",
        )

    update_data = version_data.model_dump(
        exclude_unset=True, exclude={"SaaSProducts", "SetupPackages"}
    )

    # Handle SaaS products update if provided
    if version_data.SaaSProducts is not None:
        # Delete existing
        db.query(QuoteVersionSaaSProduct).filter(
            QuoteVersionSaaSProduct.QuoteVersionId == version.Id
        ).delete()

        # Add new ones
        total_saas_monthly = Decimal("0")
        for saas_data in version_data.SaaSProducts:
            product = (
                db.query(SaaSProduct).filter(SaaSProduct.Id == saas_data.SaaSProductId).first()
            )
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"SaaS product {saas_data.SaaSProductId} not found",
                )

            monthly_price = calculate_saas_price(product, saas_data.Quantity)
            total_saas_monthly += monthly_price

            quote_saas = QuoteVersionSaaSProduct(
                QuoteVersionId=version.Id,
                SaaSProductId=saas_data.SaaSProductId,
                Quantity=saas_data.Quantity,
                CalculatedMonthlyPrice=monthly_price,
                Notes=saas_data.Notes,
            )
            db.add(quote_saas)

        version.TotalSaaSMonthly = total_saas_monthly
        version.TotalSaaSAnnualYear1 = total_saas_monthly * 12

    # Handle setup packages update if provided
    if version_data.SetupPackages is not None:
        # Delete existing
        db.query(QuoteVersionSetupPackage).filter(
            QuoteVersionSetupPackage.QuoteVersionId == version.Id
        ).delete()

        # Add new ones
        total_setup = Decimal("0")
        for setup_data in version_data.SetupPackages:
            sku = (
                db.query(SKUDefinition)
                .filter(SKUDefinition.Id == setup_data.SKUDefinitionId)
                .first()
            )
            if not sku:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"SKU {setup_data.SKUDefinitionId} not found",
                )

            calculated_price = (sku.FixedPrice or Decimal("0")) * setup_data.Quantity
            total_setup += calculated_price

            quote_setup = QuoteVersionSetupPackage(
                QuoteVersionId=version.Id,
                SKUDefinitionId=setup_data.SKUDefinitionId,
                Quantity=setup_data.Quantity,
                CalculatedPrice=calculated_price,
                CustomScopeNotes=setup_data.CustomScopeNotes,
                SequenceOrder=setup_data.SequenceOrder,
            )
            db.add(quote_setup)

        version.TotalSetupPackages = total_setup

    # Update other fields
    for field, value in update_data.items():
        setattr(version, field, value)

    db.commit()
    db.refresh(version)
    return version


@router.delete(
    "/{quote_id}/versions/{version_number}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_quote_version(
    quote_id: UUID,
    version_number: int,
    db: Session = Depends(get_db),
) -> None:
    """Delete a quote version.

    Args:
        quote_id: UUID of the quote
        version_number: Version number
        db: Database session

    Raises:
        HTTPException: If version not found or cannot be deleted
    """
    version = (
        db.query(QuoteVersion)
        .filter(
            QuoteVersion.QuoteId == quote_id,
            QuoteVersion.VersionNumber == version_number,
        )
        .first()
    )
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote version not found")

    # Don't allow deleting sent/accepted versions
    if version.VersionStatus in ["SENT", "ACCEPTED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete {version.VersionStatus.lower()} version",
        )

    db.delete(version)
    db.commit()
