"""add projects table + conversations.project_id FK

Revision ID: 005_add_projects
Revises: 004_add_conversation_labels
Create Date: 2026-05-05

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "005_add_projects"
down_revision: Union[str, None] = "004_add_conversation_labels"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the projects table and link conversations.project_id."""
    op.create_table(
        "projects",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_projects_user_id", "projects", ["user_id"])

    op.add_column(
        "conversations",
        sa.Column(
            "project_id",
            sa.Uuid(),
            sa.ForeignKey("projects.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_conversations_project_id", "conversations", ["project_id"]
    )


def downgrade() -> None:
    """Drop the project_id FK + projects table."""
    op.drop_index("ix_conversations_project_id", table_name="conversations")
    op.drop_column("conversations", "project_id")
    op.drop_index("ix_projects_user_id", table_name="projects")
    op.drop_table("projects")
