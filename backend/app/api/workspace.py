"""HTTP endpoints for workspace management.

Workspaces are OpenClaw-style agent home directories.  Each user can own
multiple workspaces; the frontend shows the file tree and lets users read,
write, and delete files inside their workspace.

Agents access the filesystem directly via tools — these endpoints exist
purely to surface workspace data in the UI.

Mounted at: /api/v1/workspaces
"""

from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.workspace import list_workspaces, get_default_workspace
from app.db import User, get_async_session
from app.models import Workspace
from app.schemas import (
    WorkspaceFileContent,
    WorkspaceFileNode,
    WorkspaceFileWrite,
    WorkspaceRead,
    WorkspaceTreeResponse,
)
from app.users import current_active_user


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_owned_workspace(
    workspace_id: uuid.UUID,
    user: User,
    session: AsyncSession,
) -> Workspace:
    """Fetch a workspace by ID and verify it belongs to the authenticated user."""
    result = await session.execute(
        select(Workspace).where(
            Workspace.id == workspace_id,
            Workspace.user_id == user.id,
        )
    )
    ws = result.scalar_one_or_none()
    if ws is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    return ws


def _safe_child(root: Path, relative: str) -> Path:
    """Resolve a workspace-relative path and verify it stays inside the root.

    Raises 400 if the path escapes the workspace root (directory traversal).
    """
    resolved = (root / relative).resolve()
    try:
        resolved.relative_to(root.resolve())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Path must be inside the workspace",
        )
    return resolved


def _build_tree(root: Path, relative_root: Path | None = None) -> list[WorkspaceFileNode]:
    """Recursively build a flat list of file-tree nodes.

    ``relative_root`` is the workspace root used to compute workspace-relative
    paths; it defaults to ``root`` on the first call.
    """
    if relative_root is None:
        relative_root = root

    nodes: list[WorkspaceFileNode] = []
    try:
        entries = sorted(root.iterdir(), key=lambda p: (p.is_file(), p.name))
    except PermissionError:
        return nodes

    for entry in entries:
        rel = entry.relative_to(relative_root).as_posix()
        if entry.is_dir():
            nodes.append(WorkspaceFileNode(name=entry.name, path=rel, is_dir=True))
            nodes.extend(_build_tree(entry, relative_root))
        else:
            nodes.append(
                WorkspaceFileNode(
                    name=entry.name,
                    path=rel,
                    is_dir=False,
                    size=entry.stat().st_size,
                )
            )
    return nodes


# ---------------------------------------------------------------------------
# Router factory
# ---------------------------------------------------------------------------

def get_workspace_router() -> APIRouter:
    """Build the workspace router (mounted at /api/v1/workspaces)."""
    router = APIRouter(prefix="/api/v1/workspaces", tags=["workspaces"])

    # ------------------------------------------------------------------
    # List workspaces
    # ------------------------------------------------------------------

    @router.get("", response_model=list[WorkspaceRead])
    async def list_user_workspaces(
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ) -> list[WorkspaceRead]:
        """Return all workspaces owned by the authenticated user."""
        workspaces = await list_workspaces(user.id, session)
        return [WorkspaceRead.model_validate(ws) for ws in workspaces]

    # ------------------------------------------------------------------
    # File tree
    # ------------------------------------------------------------------

    @router.get("/{workspace_id}/tree", response_model=WorkspaceTreeResponse)
    async def get_workspace_tree(
        workspace_id: uuid.UUID,
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ) -> WorkspaceTreeResponse:
        """Return the full file tree of a workspace as a flat node list."""
        ws = await _get_owned_workspace(workspace_id, user, session)
        root = Path(ws.path)
        if not root.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace directory not found on disk",
            )
        return WorkspaceTreeResponse(
            workspace_id=ws.id,
            nodes=_build_tree(root),
        )

    # ------------------------------------------------------------------
    # Read file
    # ------------------------------------------------------------------

    @router.get("/{workspace_id}/files/{file_path:path}", response_model=WorkspaceFileContent)
    async def read_workspace_file(
        workspace_id: uuid.UUID,
        file_path: str,
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ) -> WorkspaceFileContent:
        """Read a file's text content from the workspace."""
        ws = await _get_owned_workspace(workspace_id, user, session)
        target = _safe_child(Path(ws.path), file_path)

        if not target.exists():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        if target.is_dir():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Path is a directory, not a file",
            )

        try:
            content = target.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="File is not valid UTF-8 text",
            )

        return WorkspaceFileContent(path=file_path, content=content)

    # ------------------------------------------------------------------
    # Write file
    # ------------------------------------------------------------------

    @router.put(
        "/{workspace_id}/files/{file_path:path}",
        response_model=WorkspaceFileContent,
        status_code=status.HTTP_200_OK,
    )
    async def write_workspace_file(
        workspace_id: uuid.UUID,
        file_path: str,
        payload: WorkspaceFileWrite,
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ) -> WorkspaceFileContent:
        """Create or replace a text file inside the workspace."""
        ws = await _get_owned_workspace(workspace_id, user, session)
        target = _safe_child(Path(ws.path), file_path)

        if target.is_dir():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Path resolves to a directory",
            )

        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(payload.content, encoding="utf-8")

        return WorkspaceFileContent(path=file_path, content=payload.content)

    # ------------------------------------------------------------------
    # Delete file
    # ------------------------------------------------------------------

    @router.delete(
        "/{workspace_id}/files/{file_path:path}",
        status_code=status.HTTP_204_NO_CONTENT,
    )
    async def delete_workspace_file(
        workspace_id: uuid.UUID,
        file_path: str,
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ) -> None:
        """Delete a file from the workspace.  Does not delete directories."""
        ws = await _get_owned_workspace(workspace_id, user, session)
        target = _safe_child(Path(ws.path), file_path)

        if not target.exists():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        if target.is_dir():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Use a dedicated endpoint to delete directories",
            )

        target.unlink()

    return router
