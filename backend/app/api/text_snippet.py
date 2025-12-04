"""API endpoints for text snippet management."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.models import PricingVersion, TextSnippet
from app.schemas import TextSnippetCreate, TextSnippetResponse, TextSnippetUpdate

router = APIRouter(prefix="/text-snippets", tags=["text-snippet"])


@router.get("/", response_model=list[TextSnippetResponse])
def list_text_snippets(
    pricing_version_id: UUID | None = None,
    category: str | None = None,
    is_active: bool | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
) -> list[TextSnippet]:
    """List all text snippets with optional filtering.

    Args:
        pricing_version_id: Filter by pricing version
        category: Filter by category
        is_active: Filter by active status
        skip: Number of records to skip
        limit: Maximum number of records to return
        db: Database session

    Returns:
        List of text snippets
    """
    query = db.query(TextSnippet)

    if pricing_version_id:
        query = query.filter(TextSnippet.PricingVersionId == pricing_version_id)
    if category:
        query = query.filter(TextSnippet.Category == category)
    if is_active is not None:
        query = query.filter(TextSnippet.IsActive == is_active)

    snippets = (
        query.order_by(TextSnippet.Category, TextSnippet.SortOrder, TextSnippet.SnippetLabel)
        .offset(skip)
        .limit(limit)
        .all()
    )
    return snippets


@router.get("/{snippet_id}", response_model=TextSnippetResponse)
def get_text_snippet(snippet_id: UUID, db: Session = Depends(get_db)) -> TextSnippet:
    """Get a specific text snippet by ID.

    Args:
        snippet_id: UUID of the text snippet
        db: Database session

    Returns:
        Text snippet

    Raises:
        HTTPException: If snippet not found
    """
    snippet = db.query(TextSnippet).filter(TextSnippet.Id == snippet_id).first()
    if not snippet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Text snippet not found")
    return snippet


@router.post("/", response_model=TextSnippetResponse, status_code=status.HTTP_201_CREATED)
def create_text_snippet(
    snippet_data: TextSnippetCreate,
    db: Session = Depends(get_db),
) -> TextSnippet:
    """Create a new text snippet.

    Args:
        snippet_data: Text snippet data
        db: Database session

    Returns:
        Created text snippet

    Raises:
        HTTPException: If pricing version not found or is locked,
                      or if snippet key already exists in that version
    """
    # Verify pricing version exists and is not locked
    pricing_version = (
        db.query(PricingVersion).filter(PricingVersion.Id == snippet_data.PricingVersionId).first()
    )
    if not pricing_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pricing version not found",
        )
    if pricing_version.IsLocked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add text snippet to locked pricing version",
        )

    # Check if snippet key already exists in this pricing version
    existing = (
        db.query(TextSnippet)
        .filter(
            TextSnippet.PricingVersionId == snippet_data.PricingVersionId,
            TextSnippet.SnippetKey == snippet_data.SnippetKey,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Snippet key {snippet_data.SnippetKey} already exists in this pricing version",
        )

    # Create new text snippet
    snippet = TextSnippet(**snippet_data.model_dump())
    db.add(snippet)
    db.commit()
    db.refresh(snippet)
    return snippet


@router.patch("/{snippet_id}", response_model=TextSnippetResponse)
def update_text_snippet(
    snippet_id: UUID,
    snippet_data: TextSnippetUpdate,
    db: Session = Depends(get_db),
) -> TextSnippet:
    """Update a text snippet.

    Args:
        snippet_id: UUID of the text snippet
        snippet_data: Updated text snippet data
        db: Database session

    Returns:
        Updated text snippet

    Raises:
        HTTPException: If snippet not found or pricing version is locked
    """
    snippet = db.query(TextSnippet).filter(TextSnippet.Id == snippet_id).first()
    if not snippet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text snippet not found",
        )

    # Check if pricing version is locked
    pricing_version = (
        db.query(PricingVersion).filter(PricingVersion.Id == snippet.PricingVersionId).first()
    )
    if pricing_version and pricing_version.IsLocked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update text snippet in locked pricing version",
        )

    # Update text snippet
    update_data = snippet_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(snippet, field, value)

    db.commit()
    db.refresh(snippet)
    return snippet


@router.delete("/{snippet_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_text_snippet(snippet_id: UUID, db: Session = Depends(get_db)) -> None:
    """Delete a text snippet.

    Args:
        snippet_id: UUID of the text snippet
        db: Database session

    Raises:
        HTTPException: If snippet not found, pricing version is locked, or has dependencies
    """
    snippet = db.query(TextSnippet).filter(TextSnippet.Id == snippet_id).first()
    if not snippet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text snippet not found",
        )

    # Check if pricing version is locked
    pricing_version = (
        db.query(PricingVersion).filter(PricingVersion.Id == snippet.PricingVersionId).first()
    )
    if pricing_version and pricing_version.IsLocked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete text snippet from locked pricing version",
        )

    try:
        db.delete(snippet)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete text snippet with existing dependencies",
        ) from e
