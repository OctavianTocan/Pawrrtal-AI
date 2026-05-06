"""add user_personalization table

Revision ID: 006_add_user_personalization
Revises: 005_add_projects
Create Date: 2026-05-05

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006_add_user_personalization"
down_revision: Union[str, None] = "005_add_projects"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the user_personalization table.

    1:1 with `user`. Stores answers from the home-page personalization
    wizard (identity, goals, ChatGPT context blob, personality, connected
    messaging channels, custom instructions). All fields nullable so a
    partial profile round-trips cleanly.
    """
    op.create_table(
        "user_personalization",
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("company_website", sa.String(length=2048), nullable=True),
        sa.Column("linkedin", sa.String(length=2048), nullable=True),
        sa.Column("role", sa.String(length=255), nullable=True),
        # JSON arrays (str[]) — Postgres JSONB / SQLite JSON. Default to []
        # at the application layer when missing so downstream code can
        # iterate without nil-guards.
        sa.Column("goals", sa.JSON(), nullable=True),
        sa.Column("connected_channels", sa.JSON(), nullable=True),
        sa.Column("chatgpt_context", sa.Text(), nullable=True),
        sa.Column("personality", sa.String(length=64), nullable=True),
        sa.Column("custom_instructions", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    """Drop the user_personalization table."""
    op.drop_table("user_personalization")
