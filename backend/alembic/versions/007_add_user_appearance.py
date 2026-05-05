"""add user_appearance table

Revision ID: 007_add_user_appearance
Revises: 006_add_user_personalization
Create Date: 2026-05-05

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "007_add_user_appearance"
down_revision: Union[str, None] = "006_add_user_personalization"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the user_appearance table.

    1:1 with `user`. Stores per-user theme overrides for the Settings →
    Appearance panel. Every field is JSON so the schema can evolve
    (new color slots, new font slots, new options) without a migration
    per addition. Missing keys at the application layer fall back to the
    Mistral-inspired defaults baked into ``frontend/app/globals.css``.
    """
    op.create_table(
        "user_appearance",
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        # Per-mode color overrides: { background, foreground, accent,
        # info, success, destructive }. Keys missing from the JSON map
        # fall back to defaults; a fully empty object means "no overrides".
        sa.Column("light", sa.JSON(), nullable=True),
        sa.Column("dark", sa.JSON(), nullable=True),
        # Font family overrides: { display, sans, mono }.
        sa.Column("fonts", sa.JSON(), nullable=True),
        # Mode + global tweaks: theme_mode (light|dark|system),
        # translucent_sidebar, contrast (0-100), pointer_cursors,
        # ui_font_size (px).
        sa.Column("options", sa.JSON(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    """Drop the user_appearance table."""
    op.drop_table("user_appearance")
