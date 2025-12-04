"""add_audit_logs_table

Revision ID: f82fb4b4bec6
Revises: 83ca9464141d
Create Date: 2025-12-04 14:27:46.633561

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f82fb4b4bec6"
down_revision: str | Sequence[str] | None = "83ca9464141d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "AuditLogs",
        sa.Column(
            "Id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "Timestamp",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("UserId", sa.String(255), nullable=False),
        sa.Column("Action", sa.String(10), nullable=False),
        sa.Column("TableName", sa.String(100), nullable=False),
        sa.Column("RecordId", sa.String(255), nullable=False),
        sa.Column("OldValues", sa.JSON(), nullable=True),
        sa.Column("NewValues", sa.JSON(), nullable=True),
        sa.Column("Changes", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("Id"),
    )

    # Create indexes for common queries
    op.create_index("ix_AuditLogs_Timestamp", "AuditLogs", ["Timestamp"])
    op.create_index("ix_AuditLogs_UserId", "AuditLogs", ["UserId"])
    op.create_index("ix_AuditLogs_Action", "AuditLogs", ["Action"])
    op.create_index("ix_AuditLogs_TableName", "AuditLogs", ["TableName"])
    op.create_index("ix_AuditLogs_RecordId", "AuditLogs", ["RecordId"])

    # Composite index for common query pattern (table + record)
    op.create_index("ix_AuditLogs_TableName_RecordId", "AuditLogs", ["TableName", "RecordId"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_AuditLogs_TableName_RecordId", "AuditLogs")
    op.drop_index("ix_AuditLogs_RecordId", "AuditLogs")
    op.drop_index("ix_AuditLogs_TableName", "AuditLogs")
    op.drop_index("ix_AuditLogs_Action", "AuditLogs")
    op.drop_index("ix_AuditLogs_UserId", "AuditLogs")
    op.drop_index("ix_AuditLogs_Timestamp", "AuditLogs")
    op.drop_table("AuditLogs")
