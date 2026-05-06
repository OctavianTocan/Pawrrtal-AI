"""add conversation labels column

Revision ID: 004_add_conversation_labels
Revises: 003_add_chat_messages
Create Date: 2026-05-04

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "004_add_conversation_labels"
down_revision: Union[str, None] = "003_add_chat_messages"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add a JSON `labels` column on conversations.

    Defaults to an empty JSON array (`'[]'`) so existing rows backfill cleanly
    and `Conversation.labels.append(...)` never has to guard against None.
    """
    op.add_column(
        "conversations",
        sa.Column(
            "labels",
            sa.JSON(),
            nullable=False,
            server_default="[]",
        ),
    )


def downgrade() -> None:
    """Remove the labels column added in upgrade."""
    op.drop_column("conversations", "labels")
