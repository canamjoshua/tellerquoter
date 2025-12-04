"""Pydantic schemas for text snippets."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class TextSnippetBase(BaseModel):
    """Base schema for text snippet."""

    PricingVersionId: UUID = Field(..., description="Link to pricing version")
    SnippetKey: str = Field(
        ..., max_length=100, description="Unique key identifier (e.g., 'INTRO_TEXT')"
    )
    SnippetLabel: str = Field(..., max_length=255, description="Human-readable label")
    Content: str = Field(..., description="The actual text content of the snippet")
    Category: str = Field(
        ..., max_length=50, description="Category (e.g., 'OrderForm', 'Proposal', 'Legal')"
    )
    SortOrder: int = Field(default=0, description="Display order for UI")
    IsActive: bool = Field(default=True, description="False if snippet is deprecated")


class TextSnippetCreate(TextSnippetBase):
    """Schema for creating a new text snippet."""

    pass


class TextSnippetUpdate(BaseModel):
    """Schema for updating a text snippet."""

    SnippetLabel: str | None = Field(None, max_length=255, description="Human-readable label")
    Content: str | None = Field(None, description="The actual text content of the snippet")
    Category: str | None = Field(None, max_length=50, description="Category")
    SortOrder: int | None = Field(None, description="Display order for UI")
    IsActive: bool | None = Field(None, description="False if snippet is deprecated")


class TextSnippetResponse(TextSnippetBase):
    """Schema for text snippet response."""

    Id: UUID
    CreatedAt: datetime
    UpdatedAt: datetime

    class Config:
        from_attributes = True
