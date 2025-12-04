"""Text Snippet models - PascalCase table names AND columns."""

from datetime import datetime
from uuid import UUID as UUIDType
from uuid import uuid4

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class TextSnippet(Base):  # type: ignore[misc]
    """
    Text snippets table.

    Stores reusable text snippets for order forms and proposals.
    Linked to pricing versions for immutability.
    """

    __tablename__ = "TextSnippets"

    Id: Mapped[UUIDType] = mapped_column(
        "Id",
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=func.gen_random_uuid(),
    )
    PricingVersionId: Mapped[UUIDType] = mapped_column(
        "PricingVersionId",
        UUID(as_uuid=True),
        ForeignKey("PricingVersions.Id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="Link to pricing version",
    )
    SnippetKey: Mapped[str] = mapped_column(
        "SnippetKey",
        String(100),
        nullable=False,
        index=True,
        comment="Unique key identifier for the snippet (e.g., 'INTRO_TEXT', 'TERMS')",
    )
    SnippetLabel: Mapped[str] = mapped_column(
        "SnippetLabel",
        String(255),
        nullable=False,
        comment="Human-readable label for the snippet",
    )
    Content: Mapped[str] = mapped_column(
        "Content",
        Text,
        nullable=False,
        comment="The actual text content of the snippet",
    )
    Category: Mapped[str] = mapped_column(
        "Category",
        String(50),
        nullable=False,
        index=True,
        comment="Category of snippet (e.g., 'OrderForm', 'Proposal', 'Legal')",
    )
    SortOrder: Mapped[int] = mapped_column(
        "SortOrder",
        nullable=False,
        default=0,
        server_default="0",
        comment="Display order for UI",
    )
    IsActive: Mapped[bool] = mapped_column(
        "IsActive",
        Boolean,
        default=True,
        server_default="true",
        nullable=False,
        comment="False if snippet is deprecated",
    )
    CreatedAt: Mapped[datetime] = mapped_column(
        "CreatedAt",
        server_default=func.now(),
        nullable=False,
        comment="Timestamp when snippet was created",
    )
    UpdatedAt: Mapped[datetime] = mapped_column(
        "UpdatedAt",
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="Timestamp when snippet was last updated",
    )

    def __repr__(self) -> str:
        """String representation."""
        return f"<TextSnippet(key={self.SnippetKey}, label={self.SnippetLabel})>"
