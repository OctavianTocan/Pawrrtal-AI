"""add chat_messages table

Revision ID: 003_add_chat_messages
Revises: 002_add_model_id
Create Date: 2026-05-04

Sidecar table that captures the full UI shape of every chat turn —
content, thinking text, tool calls, timeline, and reasoning duration —
so a hard reload restores the rich chain-of-thought view instead of
just plain user/assistant text.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "003_add_chat_messages"
down_revision: Union[str, None] = "002_add_model_id"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the chat_messages table with one index on (conversation_id, ordinal)."""
    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "conversation_id",
            sa.Uuid(),
            sa.ForeignKey("conversations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("ordinal", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("thinking", sa.Text(), nullable=True),
        sa.Column("tool_calls", sa.JSON(), nullable=True),
        sa.Column("timeline", sa.JSON(), nullable=True),
        sa.Column("thinking_duration_seconds", sa.Integer(), nullable=True),
        sa.Column("assistant_status", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index(
        "ix_chat_messages_conversation_id_ordinal",
        "chat_messages",
        ["conversation_id", "ordinal"],
    )
    op.create_index(
        "ix_chat_messages_conversation_id", "chat_messages", ["conversation_id"]
    )


def downgrade() -> None:
    """Drop the chat_messages table and both indexes."""
    op.drop_index("ix_chat_messages_conversation_id", table_name="chat_messages")
    op.drop_index(
        "ix_chat_messages_conversation_id_ordinal", table_name="chat_messages"
    )
    op.drop_table("chat_messages")
