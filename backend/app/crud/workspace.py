"""Database CRUD helpers for Workspace rows.

These functions own the DB read/write side of workspace management.
Filesystem seeding lives in ``app.core.workspace`` (``seed_workspace``).
"""

from __future__ import annotations

import logging
import shutil
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import TYPE_CHECKING

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.workspace import seed_workspace

log = logging.getLogger(__name__)

if TYPE_CHECKING:
    from app.models import UserPersonalization, Workspace


async def get_default_workspace(
    user_id: uuid.UUID,
    session: AsyncSession,
) -> Workspace | None:
    """Return the user's default workspace row, or None if it doesn't exist."""
    from app.models import Workspace  # noqa: PLC0415

    result = await session.execute(
        select(Workspace)
        .where(Workspace.user_id == user_id, Workspace.is_default.is_(True))
        .limit(1)
    )
    return result.scalar_one_or_none()


async def list_workspaces(
    user_id: uuid.UUID,
    session: AsyncSession,
) -> list[Workspace]:
    """Return all workspaces owned by the user, default first."""
    from app.models import Workspace  # noqa: PLC0415

    result = await session.execute(
        select(Workspace)
        .where(Workspace.user_id == user_id)
        .order_by(Workspace.is_default.desc(), Workspace.created_at.asc())
    )
    return list(result.scalars().all())


async def create_workspace(
    user_id: uuid.UUID,
    session: AsyncSession,
    name: str = "Main",
    slug: str = "main",
    is_default: bool = True,
    personalization: UserPersonalization | None = None,
) -> Workspace:
    """Create a new workspace row in the DB and seed its directory.

    Does NOT commit — the caller is responsible for committing the session so
    this can participate in larger transactions.
    """
    from app.models import Workspace  # noqa: PLC0415

    workspace_id = uuid.uuid4()

    # Seed filesystem first so we can capture the canonical path.
    root = seed_workspace(workspace_id, personalization)

    ws = Workspace(
        id=workspace_id,
        user_id=user_id,
        name=name,
        slug=slug,
        path=str(root),
        is_default=is_default,
        created_at=datetime.now(UTC),
    )
    session.add(ws)

    return ws


async def ensure_default_workspace(
    user_id: uuid.UUID,
    session: AsyncSession,
    personalization: UserPersonalization | None = None,
) -> Workspace:
    """Return the existing default workspace or create one.

    Safe to call multiple times — idempotent against both normal duplicate
    calls and the React StrictMode double-effect pattern.

    Strategy:
    1. Fast-path: look up an existing default workspace and return it.
    2. Slow-path: create one.  If two concurrent requests both pass step 1
       before either has committed, the partial unique index
       ``uq_workspaces_one_default_per_user`` makes the second INSERT raise
       an ``IntegrityError``.  We catch that, roll back the failed nested
       savepoint, and re-fetch — which now finds the row the first request
       committed.
    """
    existing = await get_default_workspace(user_id, session)
    if existing is not None:
        return existing

    orphaned_path: Path | None = None
    try:
        # Use a savepoint so a constraint violation only rolls back this
        # nested transaction, not the whole outer session.
        async with session.begin_nested():
            ws = await create_workspace(
                user_id=user_id,
                session=session,
                name="Main",
                slug="main",
                is_default=True,
                personalization=personalization,
            )
            orphaned_path = Path(ws.path)
        return ws
    except IntegrityError:
        # Another concurrent request already inserted the default workspace.
        # The savepoint was rolled back automatically; re-fetch the winner.
        if orphaned_path is not None:
            _remove_orphan_workspace_dir(orphaned_path)
        log.warning(
            "ensure_default_workspace: IntegrityError for user %s — "
            "concurrent insert detected, re-fetching existing row.",
            user_id,
        )
        result = await get_default_workspace(user_id, session)
        if result is None:
            # Should never happen: the constraint fired but no row exists.
            raise RuntimeError(
                f"ensure_default_workspace: could not find default workspace "
                f"for user {user_id} after IntegrityError"
            ) from None
        return result


def _remove_orphan_workspace_dir(path: Path) -> None:
    """Remove a just-seeded workspace directory after its DB row rolled back."""
    try:
        workspace_base = Path(settings.workspace_base_dir).resolve()
        resolved = path.resolve()
        resolved.relative_to(workspace_base)
    except ValueError:
        log.warning("Refusing to remove workspace path outside base dir: %s", path)
        return
    except OSError:
        log.warning("Could not resolve orphan workspace path: %s", path, exc_info=True)
        return

    try:
        shutil.rmtree(resolved)
    except FileNotFoundError:
        return
    except OSError:
        log.warning("Failed to remove orphan workspace directory: %s", resolved, exc_info=True)
