"""Initial schema with v1.9 requirements

Revision ID: 41f6688b0f09
Revises:
Create Date: 2025-12-08 14:36:08.984186

"""

from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "41f6688b0f09"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
