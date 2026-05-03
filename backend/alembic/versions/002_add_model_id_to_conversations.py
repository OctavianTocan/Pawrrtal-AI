"""add model_id to conversations

Revision ID: 002_add_model_id
Revises: 001_add_conversation_metadata
Create Date: 2026-05-03

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "002_add_model_id"
down_revision: Union[str, None] = "001_add_conversation_metadata"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add model_id column to conversations."""
    op.add_column(
        "conversations",
        sa.Column(
            "model_id",
            sa.String(length=100),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Remove model_id column from conversations."""
    op.drop_column("conversations", "model_id")
