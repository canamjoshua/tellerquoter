"""Audit log models for tracking all pricing changes."""

from datetime import datetime
from typing import Any, Dict
from uuid import UUID as UUIDType
from uuid import uuid4

from sqlalchemy import JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class AuditLog(Base):  # type: ignore[misc]
    """
    Audit log table for tracking all changes to pricing data.

    Captures who made what change, when, and what the old/new values were.
    Immutable once created - never updated or deleted.
    """

    __tablename__ = "AuditLogs"

    Id: Mapped[UUIDType] = mapped_column(
        "Id",
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=func.gen_random_uuid(),
    )
    Timestamp: Mapped[datetime] = mapped_column(
        "Timestamp",
        server_default=func.now(),
        nullable=False,
        index=True,
        comment="When the change occurred",
    )
    UserId: Mapped[str] = mapped_column(
        "UserId",
        String(255),
        nullable=False,
        index=True,
        comment="User who made the change (email or ID)",
    )
    Action: Mapped[str] = mapped_column(
        "Action",
        String(10),
        nullable=False,
        index=True,
        comment="CREATE, UPDATE, or DELETE",
    )
    TableName: Mapped[str] = mapped_column(
        "TableName",
        String(100),
        nullable=False,
        index=True,
        comment="Table that was modified",
    )
    RecordId: Mapped[str] = mapped_column(
        "RecordId",
        String(255),
        nullable=False,
        index=True,
        comment="Primary key of the modified record",
    )
    OldValues: Mapped[Dict[str, Any] | None] = mapped_column(
        "OldValues",
        JSON,
        nullable=True,
        comment="JSON snapshot of old values (NULL for CREATE)",
    )
    NewValues: Mapped[Dict[str, Any] | None] = mapped_column(
        "NewValues",
        JSON,
        nullable=True,
        comment="JSON snapshot of new values (NULL for DELETE)",
    )
    Changes: Mapped[str | None] = mapped_column(
        "Changes",
        Text,
        nullable=True,
        comment="Human-readable summary of what changed",
    )

    def __repr__(self) -> str:
        """String representation."""
        return f"<AuditLog({self.Action} on {self.TableName} by {self.UserId})>"
