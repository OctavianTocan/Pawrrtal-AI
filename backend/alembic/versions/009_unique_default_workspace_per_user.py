"""add partial unique index — one default workspace per user

Revision ID: 009_unique_default_workspace_per_user
Revises: 008_add_workspaces
Create Date: 2026-05-07

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "009_unique_default_workspace_per_user"
down_revision: Union[str, None] = "008_add_workspaces"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add a partial unique index so each user can have at most one default workspace.

    Both SQLite (≥ 3.8.9) and Postgres support partial unique indexes with a
    WHERE clause.  We use ``true`` (lowercase) which both engines accept as a
    boolean literal, avoiding the ``IS TRUE`` syntax that was only added to
    SQLite in 3.35 (2021-03-12).

    If the database already has duplicate default-workspace rows for any user,
    run the companion cleanup script (``scripts/dedupe_default_workspaces.py``)
    *before* applying this migration.  On a fresh dev database the migration
    is safe to apply directly.
    """
    op.execute(
        sa.text(
            "CREATE UNIQUE INDEX IF NOT EXISTS "
            "uq_workspaces_one_default_per_user "
            "ON workspaces (user_id) "
            "WHERE is_default = true"
        )
    )


def downgrade() -> None:
    op.execute(sa.text("DROP INDEX IF EXISTS uq_workspaces_one_default_per_user"))
