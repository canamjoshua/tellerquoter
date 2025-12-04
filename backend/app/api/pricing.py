"""API endpoints for pricing version management."""

from typing import Any, Dict
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.models import (
    MatureIntegration,
    PricingVersion,
    Referrer,
    SaaSProduct,
    SKUDefinition,
    TextSnippet,
    TravelZone,
)
from app.schemas import (
    PricingVersionCreate,
    PricingVersionResponse,
    PricingVersionUpdate,
    VersionComparison,
)

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


@router.post(
    "/{version_id}/clone",
    response_model=PricingVersionResponse,
    status_code=status.HTTP_201_CREATED,
)
def clone_pricing_version(
    version_id: UUID,
    new_version_number: str,
    new_description: str | None = None,
    db: Session = Depends(get_db),
) -> PricingVersion:
    """Clone an existing pricing version with all its related data.

    Creates a deep copy of the pricing version including:
    - All SKU definitions
    - All SaaS products
    - All travel zones
    - All referrers
    - All text snippets
    - All mature integrations

    Args:
        version_id: UUID of the pricing version to clone
        new_version_number: Version number for the cloned version
        new_description: Optional description for the cloned version
        db: Database session

    Returns:
        Newly created pricing version

    Raises:
        HTTPException: If source version not found or new version number already exists
    """
    # Get source version
    source_version = db.query(PricingVersion).filter(PricingVersion.Id == version_id).first()
    if not source_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Source pricing version not found"
        )

    # Check if new version number already exists
    existing = (
        db.query(PricingVersion).filter(PricingVersion.VersionNumber == new_version_number).first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Version number {new_version_number} already exists",
        )

    # Create new pricing version
    new_version = PricingVersion(
        VersionNumber=new_version_number,
        Description=new_description or f"Cloned from {source_version.VersionNumber}",
        EffectiveDate=source_version.EffectiveDate,
        ExpirationDate=source_version.ExpirationDate,
        CreatedBy=source_version.CreatedBy,
        IsCurrent=False,  # Cloned versions are never current by default
        IsLocked=False,  # Cloned versions are never locked
    )
    db.add(new_version)
    db.flush()  # Get the new version ID without committing

    # Clone SKU definitions
    source_skus = db.query(SKUDefinition).filter(SKUDefinition.PricingVersionId == version_id).all()
    for sku in source_skus:
        new_sku = SKUDefinition(
            PricingVersionId=new_version.Id,
            SKUCode=sku.SKUCode,
            Name=sku.Name,
            Description=sku.Description,
            Category=sku.Category,
            FixedPrice=sku.FixedPrice,
            RequiresQuantity=sku.RequiresQuantity,
            RequiresTravelZone=sku.RequiresTravelZone,
            RequiresConfiguration=sku.RequiresConfiguration,
            IsActive=sku.IsActive,
            SortOrder=sku.SortOrder,
            EarmarkedStatus=sku.EarmarkedStatus,
            EstimatedHours=sku.EstimatedHours,
            AcceptanceCriteria=sku.AcceptanceCriteria,
        )
        db.add(new_sku)

    # Clone SaaS products
    source_saas = db.query(SaaSProduct).filter(SaaSProduct.PricingVersionId == version_id).all()
    for product in source_saas:
        new_product = SaaSProduct(
            PricingVersionId=new_version.Id,
            ProductCode=product.ProductCode,
            Name=product.Name,
            Description=product.Description,
            Category=product.Category,
            PricingModel=product.PricingModel,
            Tier1Min=product.Tier1Min,
            Tier1Max=product.Tier1Max,
            Tier1Price=product.Tier1Price,
            Tier2Min=product.Tier2Min,
            Tier2Max=product.Tier2Max,
            Tier2Price=product.Tier2Price,
            Tier3Min=product.Tier3Min,
            Tier3Max=product.Tier3Max,
            Tier3Price=product.Tier3Price,
            IsActive=product.IsActive,
            IsRequired=product.IsRequired,
            SortOrder=product.SortOrder,
        )
        db.add(new_product)

    # Clone travel zones
    source_zones = db.query(TravelZone).filter(TravelZone.PricingVersionId == version_id).all()
    for zone in source_zones:
        new_zone = TravelZone(
            PricingVersionId=new_version.Id,
            ZoneCode=zone.ZoneCode,
            Name=zone.Name,
            Description=zone.Description,
            MileageRate=zone.MileageRate,
            DailyRate=zone.DailyRate,
            HourlyRate=zone.HourlyRate,
            OnsiteDaysIncluded=zone.OnsiteDaysIncluded,
            AirfareEstimate=zone.AirfareEstimate,
            HotelRate=zone.HotelRate,
            MealsRate=zone.MealsRate,
            RentalCarRate=zone.RentalCarRate,
            ParkingRate=zone.ParkingRate,
            IsActive=zone.IsActive,
            SortOrder=zone.SortOrder,
        )
        db.add(new_zone)

    # Clone referrers
    source_referrers = db.query(Referrer).filter(Referrer.PricingVersionId == version_id).all()
    for referrer in source_referrers:
        new_referrer = Referrer(
            PricingVersionId=new_version.Id,
            ReferrerName=referrer.ReferrerName,
            StandardRate=referrer.StandardRate,
            IsActive=referrer.IsActive,
            SortOrder=referrer.SortOrder,
        )
        db.add(new_referrer)

    # Clone text snippets
    source_snippets = db.query(TextSnippet).filter(TextSnippet.PricingVersionId == version_id).all()
    for snippet in source_snippets:
        new_snippet = TextSnippet(
            PricingVersionId=new_version.Id,
            SnippetKey=snippet.SnippetKey,
            SnippetType=snippet.SnippetType,
            Title=snippet.Title,
            Content=snippet.Content,
            IsActive=snippet.IsActive,
            SortOrder=snippet.SortOrder,
        )
        db.add(new_snippet)

    # Clone mature integrations
    source_integrations = (
        db.query(MatureIntegration).filter(MatureIntegration.PricingVersionId == version_id).all()
    )
    for integration in source_integrations:
        new_integration = MatureIntegration(
            PricingVersionId=new_version.Id,
            IntegrationName=integration.IntegrationName,
            VendorName=integration.VendorName,
            IsActive=integration.IsActive,
            SortOrder=integration.SortOrder,
        )
        db.add(new_integration)

    # Commit all changes
    db.commit()
    db.refresh(new_version)

    return new_version


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


@router.get("/compare", response_model=VersionComparison)
def compare_pricing_versions(
    version1_id: UUID,
    version2_id: UUID,
    db: Session = Depends(get_db),
) -> VersionComparison:
    """Compare two pricing versions and return differences.

    Args:
        version1_id: UUID of first pricing version (baseline)
        version2_id: UUID of second pricing version (comparison target)
        db: Database session

    Returns:
        Detailed comparison showing what was added, removed, modified, or unchanged

    Raises:
        HTTPException: If either version not found
    """
    # Get both versions
    version1 = db.query(PricingVersion).filter(PricingVersion.Id == version1_id).first()
    if not version1:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version 1 not found")

    version2 = db.query(PricingVersion).filter(PricingVersion.Id == version2_id).first()
    if not version2:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version 2 not found")

    # Get all related data for both versions
    v1_skus = {
        sku.SKUCode: sku
        for sku in db.query(SKUDefinition)
        .filter(SKUDefinition.PricingVersionId == version1_id)
        .all()
    }
    v2_skus = {
        sku.SKUCode: sku
        for sku in db.query(SKUDefinition)
        .filter(SKUDefinition.PricingVersionId == version2_id)
        .all()
    }

    v1_saas = {
        prod.ProductCode: prod
        for prod in db.query(SaaSProduct).filter(SaaSProduct.PricingVersionId == version1_id).all()
    }
    v2_saas = {
        prod.ProductCode: prod
        for prod in db.query(SaaSProduct).filter(SaaSProduct.PricingVersionId == version2_id).all()
    }

    v1_zones = {
        zone.ZoneCode: zone
        for zone in db.query(TravelZone).filter(TravelZone.PricingVersionId == version1_id).all()
    }
    v2_zones = {
        zone.ZoneCode: zone
        for zone in db.query(TravelZone).filter(TravelZone.PricingVersionId == version2_id).all()
    }

    v1_referrers = {
        ref.ReferrerName: ref
        for ref in db.query(Referrer).filter(Referrer.PricingVersionId == version1_id).all()
    }
    v2_referrers = {
        ref.ReferrerName: ref
        for ref in db.query(Referrer).filter(Referrer.PricingVersionId == version2_id).all()
    }

    v1_snippets = {
        snip.SnippetKey: snip
        for snip in db.query(TextSnippet).filter(TextSnippet.PricingVersionId == version1_id).all()
    }
    v2_snippets = {
        snip.SnippetKey: snip
        for snip in db.query(TextSnippet).filter(TextSnippet.PricingVersionId == version2_id).all()
    }

    # Helper function to compare items
    def compare_items(
        v1_dict: Dict[str, Any], v2_dict: Dict[str, Any], compare_fields: list[str]
    ) -> tuple[list[Dict[str, Any]], list[Dict[str, Any]], list[Dict[str, Any]]]:
        added = []
        removed = []
        modified = []
        unchanged = []

        # Find added items (in v2 but not v1)
        for key, item in v2_dict.items():
            if key not in v1_dict:
                added.append(item)

        # Find removed items (in v1 but not v2)
        for key, item in v1_dict.items():
            if key not in v2_dict:
                removed.append(item)

        # Find modified/unchanged items (in both)
        for key in set(v1_dict.keys()) & set(v2_dict.keys()):
            v1_item = v1_dict[key]
            v2_item = v2_dict[key]

            changed_fields = []
            for field in compare_fields:
                v1_val = getattr(v1_item, field, None)
                v2_val = getattr(v2_item, field, None)
                if v1_val != v2_val:
                    changed_fields.append(field)

            if changed_fields:
                modified.append(
                    {
                        "key": key,
                        "old": v1_item,
                        "new": v2_item,
                        "changed_fields": changed_fields,
                    }
                )
            else:
                unchanged.append(v2_item)

        return added, removed, modified, unchanged

    # Compare SKUs
    sku_fields = [
        "Name",
        "Description",
        "Category",
        "FixedPrice",
        "RequiresQuantity",
        "RequiresTravelZone",
        "RequiresConfiguration",
        "IsActive",
        "SortOrder",
        "EarmarkedStatus",
        "EstimatedHours",
        "AcceptanceCriteria",
    ]
    skus_added, skus_removed, skus_modified, skus_unchanged = compare_items(
        v1_skus, v2_skus, sku_fields
    )

    # Compare SaaS products
    saas_fields = [
        "Name",
        "Description",
        "Category",
        "PricingModel",
        "Tier1Min",
        "Tier1Max",
        "Tier1Price",
        "Tier2Min",
        "Tier2Max",
        "Tier2Price",
        "Tier3Min",
        "Tier3Max",
        "Tier3Price",
        "IsActive",
        "IsRequired",
        "SortOrder",
    ]
    saas_added, saas_removed, saas_modified, saas_unchanged = compare_items(
        v1_saas, v2_saas, saas_fields
    )

    # Compare travel zones
    zone_fields = [
        "Name",
        "Description",
        "MileageRate",
        "DailyRate",
        "HourlyRate",
        "OnsiteDaysIncluded",
        "AirfareEstimate",
        "HotelRate",
        "MealsRate",
        "RentalCarRate",
        "ParkingRate",
        "IsActive",
        "SortOrder",
    ]
    zones_added, zones_removed, zones_modified, zones_unchanged = compare_items(
        v1_zones, v2_zones, zone_fields
    )

    # Compare referrers
    referrer_fields = ["StandardRate", "IsActive", "SortOrder"]
    referrers_added, referrers_removed, referrers_modified, referrers_unchanged = compare_items(
        v1_referrers, v2_referrers, referrer_fields
    )

    # Compare text snippets
    snippet_fields = ["SnippetType", "Title", "Content", "IsActive", "SortOrder"]
    snippets_added, snippets_removed, snippets_modified, snippets_unchanged = compare_items(
        v1_snippets, v2_snippets, snippet_fields
    )

    # Calculate totals
    total_changes = (
        len(skus_added)
        + len(skus_removed)
        + len(skus_modified)
        + len(saas_added)
        + len(saas_removed)
        + len(saas_modified)
        + len(zones_added)
        + len(zones_removed)
        + len(zones_modified)
        + len(referrers_added)
        + len(referrers_removed)
        + len(referrers_modified)
        + len(snippets_added)
        + len(snippets_removed)
        + len(snippets_modified)
    )

    return VersionComparison(
        version1=version1,
        version2=version2,
        skus_added=skus_added,
        skus_removed=skus_removed,
        skus_modified=skus_modified,
        skus_unchanged=skus_unchanged,
        saas_added=saas_added,
        saas_removed=saas_removed,
        saas_modified=saas_modified,
        saas_unchanged=saas_unchanged,
        zones_added=zones_added,
        zones_removed=zones_removed,
        zones_modified=zones_modified,
        zones_unchanged=zones_unchanged,
        referrers_added=referrers_added,
        referrers_removed=referrers_removed,
        referrers_modified=referrers_modified,
        referrers_unchanged=referrers_unchanged,
        snippets_added=snippets_added,
        snippets_removed=snippets_removed,
        snippets_modified=snippets_modified,
        snippets_unchanged=snippets_unchanged,
        total_changes=total_changes,
        has_differences=total_changes > 0,
    )
