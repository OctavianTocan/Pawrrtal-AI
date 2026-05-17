"""Add LCM (Lossless Context Management) tables.

Three tables form the storage layer for our adaptation of the LCM
approach (originally a TypeScript OpenClaw plugin from
Martian-Engineering; we ported the core algorithm to Python).

This migration only creates the schema — no application code reads or
writes these tables until later stack PRs.  Shipping the schema first
lets us land the migration cleanly without worrying about runtime
behaviour changes.

Revision ID: 015_add_lcm_tables
Revises: 014_drop_active_conversation_id
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "015_add_lcm_tables"
down_revision = "014_drop_active_conversation_id"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create the three LCM tables and their supporting indices."""
    op.create_table(
        "lcm_summaries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("conversation_id", sa.Uuid(), nullable=False),
        sa.Column("depth", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "token_count", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("model_id", sa.String(length=128), nullable=True),
        sa.Column(
            "summary_kind",
            sa.String(length=16),
            nullable=False,
            server_default="normal",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["conversation_id"], ["conversations.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_lcm_summaries_conversation_id",
        "lcm_summaries",
        ["conversation_id"],
    )
    op.create_index(
        "ix_lcm_summaries_conversation_depth",
        "lcm_summaries",
        ["conversation_id", "depth"],
    )

    op.create_table(
        "lcm_summary_sources",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("summary_id", sa.Uuid(), nullable=False),
        sa.Column("source_kind", sa.String(length=16), nullable=False),
        sa.Column("source_id", sa.Uuid(), nullable=False),
        sa.Column("source_ordinal", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["summary_id"], ["lcm_summaries.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_lcm_summary_sources_summary_id",
        "lcm_summary_sources",
        ["summary_id"],
    )
    op.create_index(
        "ix_lcm_summary_sources_source_id",
        "lcm_summary_sources",
        ["source_id"],
    )

    op.create_table(
        "lcm_context_items",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("conversation_id", sa.Uuid(), nullable=False),
        sa.Column("ordinal", sa.Integer(), nullable=False),
        sa.Column("item_kind", sa.String(length=16), nullable=False),
        sa.Column("item_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["conversation_id"], ["conversations.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        # Unique (conversation_id, ordinal) so compaction can renumber
        # densely without colliding mid-transaction.
        sa.UniqueConstraint(
            "conversation_id",
            "ordinal",
            name="uq_lcm_context_items_conv_ordinal",
        ),
    )
    op.create_index(
        "ix_lcm_context_items_conversation_id",
        "lcm_context_items",
        ["conversation_id"],
    )
    op.create_index(
        "ix_lcm_context_items_item_id",
        "lcm_context_items",
        ["item_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_lcm_context_items_item_id", table_name="lcm_context_items"
    )
    op.drop_index(
        "ix_lcm_context_items_conversation_id", table_name="lcm_context_items"
    )
    op.drop_table("lcm_context_items")

    op.drop_index(
        "ix_lcm_summary_sources_source_id", table_name="lcm_summary_sources"
    )
    op.drop_index(
        "ix_lcm_summary_sources_summary_id", table_name="lcm_summary_sources"
    )
    op.drop_table("lcm_summary_sources")

    op.drop_index(
        "ix_lcm_summaries_conversation_depth", table_name="lcm_summaries"
    )
    op.drop_index(
        "ix_lcm_summaries_conversation_id", table_name="lcm_summaries"
    )
    op.drop_table("lcm_summaries")
