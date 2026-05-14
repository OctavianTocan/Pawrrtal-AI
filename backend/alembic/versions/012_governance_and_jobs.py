"""governance + ops platform tables

Adds the four cross-cutting tables introduced in the CCT-yoink stack
(PRs 02, 04, 11, 12) plus a per-conversation ``verbose_level`` column
on ``conversations`` (PR 07).

Tables created
--------------
* ``audit_events``    — append-only typed audit log with risk levels.
* ``cost_ledger``     — one row per LLM turn; source of truth for spend.
* ``scheduled_jobs``  — durable cron job definitions for APScheduler.
* ``webhook_events``  — inbound webhook deliveries; ``delivery_id`` is
  UNIQUE for atomic INSERT…ON CONFLICT DO NOTHING dedupe.

Column added
------------
* ``conversations.verbose_level`` — nullable int; NULL inherits the
  global default from ``settings.telegram_verbose_default``.

Revision ID: 012_governance_and_jobs
Revises: 011_add_channel_columns_and_attachment
Create Date: 2026-05-14
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "012_governance_and_jobs"
down_revision: str | Sequence[str] | None = "011_add_channel_columns_and_attachment"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── conversations.verbose_level ──────────────────────────────────────
    op.add_column(
        "conversations",
        sa.Column("verbose_level", sa.Integer(), nullable=True),
    )

    # ── audit_events ─────────────────────────────────────────────────────
    op.create_table(
        "audit_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("success", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "risk_level",
            sa.String(length=16),
            nullable=False,
            server_default="low",
        ),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("surface", sa.String(length=32), nullable=True),
        sa.Column("request_id", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_events_user_id", "audit_events", ["user_id"], unique=False)
    op.create_index("ix_audit_events_event_type", "audit_events", ["event_type"], unique=False)
    op.create_index("ix_audit_events_created_at", "audit_events", ["created_at"], unique=False)

    # ── cost_ledger ──────────────────────────────────────────────────────
    op.create_table(
        "cost_ledger",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("conversation_id", sa.Uuid(), nullable=True),
        sa.Column("provider", sa.String(length=64), nullable=False),
        sa.Column("model_id", sa.String(length=100), nullable=False),
        sa.Column("input_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("output_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cost_usd", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("surface", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_cost_ledger_user_id", "cost_ledger", ["user_id"], unique=False)
    op.create_index(
        "ix_cost_ledger_conversation_id",
        "cost_ledger",
        ["conversation_id"],
        unique=False,
    )
    op.create_index("ix_cost_ledger_created_at", "cost_ledger", ["created_at"], unique=False)

    # ── scheduled_jobs ───────────────────────────────────────────────────
    op.create_table(
        "scheduled_jobs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("cron_expression", sa.String(length=128), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("skill_name", sa.String(length=64), nullable=True),
        sa.Column(
            "target_chat_ids",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
        sa.Column("working_directory", sa.String(length=4096), nullable=True),
        sa.Column("last_status", sa.String(length=16), nullable=True),
        sa.Column("last_fired_at", sa.DateTime(), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_scheduled_jobs_user_id", "scheduled_jobs", ["user_id"], unique=False)

    # ── webhook_events ───────────────────────────────────────────────────
    op.create_table(
        "webhook_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("delivery_id", sa.String(length=128), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("processed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("delivery_id", name="uq_webhook_events_delivery_id"),
    )
    op.create_index("ix_webhook_events_user_id", "webhook_events", ["user_id"], unique=False)
    op.create_index("ix_webhook_events_provider", "webhook_events", ["provider"], unique=False)
    op.create_index(
        "ix_webhook_events_delivery_id",
        "webhook_events",
        ["delivery_id"],
        unique=True,
    )
    op.create_index(
        "ix_webhook_events_created_at",
        "webhook_events",
        ["created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_webhook_events_created_at", table_name="webhook_events")
    op.drop_index("ix_webhook_events_delivery_id", table_name="webhook_events")
    op.drop_index("ix_webhook_events_provider", table_name="webhook_events")
    op.drop_index("ix_webhook_events_user_id", table_name="webhook_events")
    op.drop_table("webhook_events")

    op.drop_index("ix_scheduled_jobs_user_id", table_name="scheduled_jobs")
    op.drop_table("scheduled_jobs")

    op.drop_index("ix_cost_ledger_created_at", table_name="cost_ledger")
    op.drop_index("ix_cost_ledger_conversation_id", table_name="cost_ledger")
    op.drop_index("ix_cost_ledger_user_id", table_name="cost_ledger")
    op.drop_table("cost_ledger")

    op.drop_index("ix_audit_events_created_at", table_name="audit_events")
    op.drop_index("ix_audit_events_event_type", table_name="audit_events")
    op.drop_index("ix_audit_events_user_id", table_name="audit_events")
    op.drop_table("audit_events")

    op.drop_column("conversations", "verbose_level")
