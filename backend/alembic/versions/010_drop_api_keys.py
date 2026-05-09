"""drop api_keys table — superseded by per-user workspace .env files

Revision ID: 010_drop_api_keys
Revises: 009_unique_default_workspace_per_user, 007_add_channel_bindings
Create Date: 2026-05-09

This migration also serves as a merge point for the two pre-existing
Alembic heads in the project (the channel-bindings branch off 006 and
the workspace branch through 008/009 off 007_add_user_appearance). After
this revision the graph is linear again so deploys can run a plain
``alembic upgrade head`` instead of needing the ``heads`` (plural) form.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "010_drop_api_keys"
# Tuple form makes this a *merge* revision — Alembic walks both parents
# when upgrading and stops both when downgrading. Bringing the two heads
# back together here means the rest of the project can rely on a single
# ``head`` again, which is what the deploy automation expects.
down_revision: Union[str, Sequence[str], None] = (
    "009_unique_default_workspace_per_user",
    "007_add_channel_bindings",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Drop the ``api_keys`` table.

    Background: the original ``APIKey`` model stored Fernet-encrypted
    provider keys per user (``encrypted_key`` column). PR #143 replaces
    that mechanism with per-user encrypted ``.env`` files at
    ``{workspace_base_dir}/{user_id}/.env``, deleting the SQLAlchemy model
    in the same change.

    Any rows currently in ``api_keys`` were encrypted with the old
    ``FERNET_KEY`` env var, which has been renamed to
    ``WORKSPACE_ENCRYPTION_KEY`` in PR #143. Even if those rows still
    exist, they are unreadable post-rename without doing a manual key
    rotation, so dropping the table is not a meaningful loss of working
    data.

    Idempotent: SQLite is fine with ``op.drop_table`` against a missing
    table only if we use ``if_exists=True``; Postgres has the same flag.
    """
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "api_keys" in inspector.get_table_names():
        op.drop_table("api_keys")


def downgrade() -> None:
    """Recreate the original ``api_keys`` schema.

    Recreates the table shape that existed prior to revision
    ``010_drop_api_keys``. Note that the Fernet-encrypted column type
    used by SQLAlchemy is intentionally NOT reproduced here — Alembic
    can't represent the ``StringEncryptedType`` cleanly without pulling
    in ``sqlalchemy_utils``, and the downgrade path is for emergency
    rollback only. A flat ``String`` column is created so the table
    structure is restored; the application would need its old model
    definition restored alongside this downgrade to actually use it.
    """
    op.create_table(
        "api_keys",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("provider", sa.String(length=50), nullable=False),
        # Plain String for the rollback structure; the application code
        # at the time the rows were written used StringEncryptedType
        # which serialises to a String at the SQL level anyway.
        sa.Column("encrypted_key", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
