"""Drop user_preferences and user_personalization tables.

Both tables were the DB-backed home of user-facing preferences.  Those
preferences now live in ``{workspace_root}/preferences.toml`` so the
agent can read and write them natively via ``workspace_files`` from any
surface (web, Electron, Telegram).  The frontend personalization
endpoint reads/writes the TOML file instead of the DB row.

Per the project's explicit "no backwards-compat" policy for this
refactor, the upgrade path is destructive and the downgrade re-creates
the tables empty (no data restoration).

Revision ID: 012_drop_user_preferences_and_personalization
Revises: 011_add_channel_columns_and_attachment
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON

# ---- Alembic identifiers ---------------------------------------------------

revision = "012_drop_user_preferences_and_personalization"
down_revision = "011_add_channel_columns_and_attachment"
branch_labels = None
depends_on = None


def _json_type() -> sa.types.TypeEngine:
    """Return ``JSONB`` on Postgres, ``JSON`` everywhere else (sqlite tests)."""
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        return JSONB()
    return JSON()


def upgrade() -> None:
    """Drop both legacy preference tables."""
    op.drop_table("user_personalization")
    op.drop_table("user_preferences")


def downgrade() -> None:
    """Recreate the tables empty (no data is restored)."""
    op.create_table(
        "user_preferences",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("custom_instructions", sa.Text(), nullable=True),
        sa.Column("accent_color", sa.String(length=7), nullable=True),
        sa.Column("font_size", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )
    op.create_table(
        "user_personalization",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("company_website", sa.String(length=2048), nullable=True),
        sa.Column("linkedin", sa.String(length=2048), nullable=True),
        sa.Column("role", sa.String(length=255), nullable=True),
        sa.Column("goals", _json_type(), nullable=True),
        sa.Column("connected_channels", _json_type(), nullable=True),
        sa.Column("chatgpt_context", sa.Text(), nullable=True),
        sa.Column("personality", sa.String(length=64), nullable=True),
        sa.Column("custom_instructions", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )
