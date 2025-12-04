"""Audit logging service for tracking all pricing changes."""

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.audit import AuditLog


class AuditService:
    """Service for creating audit log entries."""

    @staticmethod
    def log_create(
        db: Session,
        user_id: str,
        table_name: str,
        record_id: str | UUID,
        new_values: dict[str, Any],
        changes_summary: str | None = None,
    ) -> AuditLog:
        """
        Log a CREATE operation.

        Args:
            db: Database session
            user_id: User who performed the action
            table_name: Name of the table
            record_id: Primary key of the created record
            new_values: New record data
            changes_summary: Optional human-readable summary

        Returns:
            Created audit log entry
        """
        audit_log = AuditLog(
            UserId=user_id,
            Action="CREATE",
            TableName=table_name,
            RecordId=str(record_id),
            OldValues=None,
            NewValues=new_values,
            Changes=changes_summary or f"Created {table_name} record",
        )
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)
        return audit_log

    @staticmethod
    def log_update(
        db: Session,
        user_id: str,
        table_name: str,
        record_id: str | UUID,
        old_values: dict[str, Any],
        new_values: dict[str, Any],
        changes_summary: str | None = None,
    ) -> AuditLog:
        """
        Log an UPDATE operation.

        Args:
            db: Database session
            user_id: User who performed the action
            table_name: Name of the table
            record_id: Primary key of the updated record
            old_values: Original record data
            new_values: Updated record data
            changes_summary: Optional human-readable summary

        Returns:
            Created audit log entry
        """
        # Generate automatic summary if not provided
        if not changes_summary:
            changed_fields = []
            for key, new_val in new_values.items():
                old_val = old_values.get(key)
                if old_val != new_val:
                    changed_fields.append(key)

            if changed_fields:
                changes_summary = f"Updated {', '.join(changed_fields)}"
            else:
                changes_summary = "No fields changed"

        audit_log = AuditLog(
            UserId=user_id,
            Action="UPDATE",
            TableName=table_name,
            RecordId=str(record_id),
            OldValues=old_values,
            NewValues=new_values,
            Changes=changes_summary,
        )
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)
        return audit_log

    @staticmethod
    def log_delete(
        db: Session,
        user_id: str,
        table_name: str,
        record_id: str | UUID,
        old_values: dict[str, Any],
        changes_summary: str | None = None,
    ) -> AuditLog:
        """
        Log a DELETE operation.

        Args:
            db: Database session
            user_id: User who performed the action
            table_name: Name of the table
            record_id: Primary key of the deleted record
            old_values: Original record data before deletion
            changes_summary: Optional human-readable summary

        Returns:
            Created audit log entry
        """
        audit_log = AuditLog(
            UserId=user_id,
            Action="DELETE",
            TableName=table_name,
            RecordId=str(record_id),
            OldValues=old_values,
            NewValues=None,
            Changes=changes_summary or f"Deleted {table_name} record",
        )
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)
        return audit_log

    @staticmethod
    def get_record_history(
        db: Session,
        table_name: str,
        record_id: str | UUID,
        limit: int = 100,
    ) -> list[AuditLog]:
        """
        Get audit history for a specific record.

        Args:
            db: Database session
            table_name: Name of the table
            record_id: Primary key of the record
            limit: Maximum number of entries to return

        Returns:
            List of audit log entries, newest first
        """
        return (
            db.query(AuditLog)
            .filter(
                AuditLog.TableName == table_name,
                AuditLog.RecordId == str(record_id),
            )
            .order_by(AuditLog.Timestamp.desc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_recent_changes(
        db: Session,
        table_name: str | None = None,
        user_id: str | None = None,
        limit: int = 100,
    ) -> list[AuditLog]:
        """
        Get recent audit log entries with optional filters.

        Args:
            db: Database session
            table_name: Optional table name filter
            user_id: Optional user ID filter
            limit: Maximum number of entries to return

        Returns:
            List of audit log entries, newest first
        """
        query = db.query(AuditLog)

        if table_name:
            query = query.filter(AuditLog.TableName == table_name)

        if user_id:
            query = query.filter(AuditLog.UserId == user_id)

        return query.order_by(AuditLog.Timestamp.desc()).limit(limit).all()

    @staticmethod
    def model_to_dict(model: Any, exclude: set[str] | None = None) -> dict[str, Any]:
        """
        Convert SQLAlchemy model instance to dictionary for audit logging.

        Args:
            model: SQLAlchemy model instance
            exclude: Set of field names to exclude

        Returns:
            Dictionary representation of the model
        """
        exclude = exclude or set()
        result = {}

        for column in model.__table__.columns:
            if column.name not in exclude:
                value = getattr(model, column.name)

                # Convert non-JSON-serializable types
                if isinstance(value, datetime | UUID):
                    value = str(value)

                result[column.name] = value

        return result
