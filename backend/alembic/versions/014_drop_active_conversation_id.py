"""drop unused channel_bindings.active_conversation_id

The column was added in migration 011 alongside the topics flag, planned
as the routing pointer for non-topic Telegram DMs. The routing path
ended up resolving the conversation through ``conversations.origin_channel``
instead, and ``active_conversation_id`` was never read or written. Drop
the dead column to remove the confusion.

Revision ID: 014_drop_active_conversation_id
Revises: 013_governance_and_jobs
Create Date: 2026-05-16
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "014_drop_active_conversation_id"
down_revision: str | Sequence[str] | None = "013_governance_and_jobs"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_column("channel_bindings", "active_conversation_id")


def downgrade() -> None:
    op.add_column(
        "channel_bindings",
        sa.Column("active_conversation_id", sa.Uuid(), nullable=True),
    )
