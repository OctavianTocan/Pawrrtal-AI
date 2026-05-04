"""add conversation metadata fields

Revision ID: 001_add_conversation_metadata
Revises:
Create Date: 2026-05-03

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "001_add_conversation_metadata"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add is_archived, is_flagged, is_unread, and status columns to conversations."""
    op.add_column(
        "conversations",
        sa.Column(
            "is_archived",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )
    op.add_column(
        "conversations",
        sa.Column(
            "is_flagged",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )
    op.add_column(
        "conversations",
        sa.Column(
            "is_unread",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )
    op.add_column(
        "conversations",
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Remove the metadata columns added in upgrade."""
    op.drop_column("conversations", "status")
    op.drop_column("conversations", "is_unread")
    op.drop_column("conversations", "is_flagged")
    op.drop_column("conversations", "is_archived")
