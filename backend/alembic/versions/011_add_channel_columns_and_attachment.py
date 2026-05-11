"""add channel columns and attachment fields

Adds three groups of new nullable / defaulted columns:

1. ``conversations``: topic routing (``telegram_thread_id``) and
   auto-title lifecycle tracking (``origin_channel``, ``title_set_by``).
2. ``channel_bindings``: optional active-conversation pointer
   (``active_conversation_id``) and topics-enabled flag
   (``has_topics_enabled``).
3. ``chat_messages``: workspace-relative attachment path and its MIME
   type (``attachment``, ``attachment_mime``), needed by the
   ``send_message`` agent tool introduced in migration 011.

Revision ID: 011_add_channel_columns_and_attachment
Revises: 010_drop_api_keys
Create Date: 2026-05-10
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "011_add_channel_columns_and_attachment"
down_revision: Union[str, Sequence[str], None] = "010_drop_api_keys"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── conversations ─────────────────────────────────────────────────────
    # Which channel spawned the conversation (e.g. "telegram", "web").
    op.add_column(
        "conversations",
        sa.Column("origin_channel", sa.String(32), nullable=True),
    )
    # Telegram Bot API 9.3+ topic thread ID — NULL for non-topic DMs.
    op.add_column(
        "conversations",
        sa.Column("telegram_thread_id", sa.Integer(), nullable=True),
    )
    # Who set the title: NULL = never set, "auto" = auto-generated,
    # "user" = user edited.  The auto-title job checks for NULL and only
    # fires once.
    op.add_column(
        "conversations",
        sa.Column("title_set_by", sa.String(16), nullable=True),
    )

    # ── channel_bindings ──────────────────────────────────────────────────
    # Pointer to the currently active conversation for non-topic DMs.
    # NULL until the first message creates a conversation.  ON DELETE SET
    # NULL so removing a conversation doesn't orphan the binding.
    op.add_column(
        "channel_bindings",
        sa.Column("active_conversation_id", sa.Uuid(), nullable=True),
    )
    # Whether the Telegram chat has Topics (forum threads) enabled.
    # Drives the routing branch: True → route by (chat_id, thread_id),
    # False → route by active_conversation_id.
    op.add_column(
        "channel_bindings",
        sa.Column(
            "has_topics_enabled",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )

    # ── chat_messages ─────────────────────────────────────────────────────
    # Workspace-relative path to a file the agent sent via send_message.
    op.add_column(
        "chat_messages",
        sa.Column("attachment", sa.String(4096), nullable=True),
    )
    # MIME type of the attachment (e.g. "image/png", "audio/ogg").
    op.add_column(
        "chat_messages",
        sa.Column("attachment_mime", sa.String(128), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("chat_messages", "attachment_mime")
    op.drop_column("chat_messages", "attachment")
    op.drop_column("channel_bindings", "has_topics_enabled")
    op.drop_column("channel_bindings", "active_conversation_id")
    op.drop_column("conversations", "title_set_by")
    op.drop_column("conversations", "telegram_thread_id")
    op.drop_column("conversations", "origin_channel")
