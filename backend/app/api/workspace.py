"""HTTP endpoints for workspace management.

Workspaces are OpenClaw-style agent home directories.  Each user can own
multiple workspaces; the frontend shows the file tree and lets users read,
write, and delete files inside their workspace.

Agents access the filesystem directly via tools — these endpoints exist
purely to surface workspace data in the UI.

Mounted at: /api/v1/workspaces
"""

from __future__ import annotations

import asyncio
import mimetypes
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.workspace import get_default_workspace, list_workspaces
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
        ) from None
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


def get_workspace_router() -> APIRouter:  # noqa: C901, PLR0915
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
        if not await asyncio.to_thread(root.exists):
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

        if not await asyncio.to_thread(target.exists):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        if await asyncio.to_thread(target.is_dir):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Path is a directory, not a file",
            )

        try:
            content = await asyncio.to_thread(target.read_text, encoding="utf-8")
        except UnicodeDecodeError as err:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="File is not valid UTF-8 text",
            ) from err

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

        if await asyncio.to_thread(target.is_dir):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Path resolves to a directory",
            )

        await asyncio.to_thread(lambda: target.parent.mkdir(parents=True, exist_ok=True))
        await asyncio.to_thread(
            lambda: target.write_text(payload.content, encoding="utf-8"),
        )

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

        if not await asyncio.to_thread(target.exists):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        if await asyncio.to_thread(target.is_dir):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Use a dedicated endpoint to delete directories",
            )

        await asyncio.to_thread(target.unlink)

    # ------------------------------------------------------------------
    # Serve binary file from the default workspace
    # ------------------------------------------------------------------

    @router.get(
        "/default/serve/{file_path:path}",
        response_class=FileResponse,
        summary="Serve a binary file from the user's default workspace",
    )
    async def serve_default_workspace_file(
        file_path: str,
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ) -> FileResponse:
        """Serve a file from the user's default workspace with its detected MIME type.

        Unlike the text-only ``GET /{workspace_id}/files/{file_path}`` endpoint,
        this route returns raw bytes (``FileResponse``) so the frontend can render
        images, audio, and other binary artifacts that agents produce via the
        ``send_message`` tool.

        Path traversal is blocked: the resolved target must stay inside the
        workspace root or the request is rejected with 400.

        Args:
            file_path: Workspace-relative path (e.g. ``artifacts/chart.png``).
            user: Authenticated caller (FastAPI dependency).
            session: Active database session (FastAPI dependency).

        Returns:
            The file streamed with the appropriate ``Content-Type`` header.
        """
        ws = await get_default_workspace(user.id, session)
        if ws is None:
            raise HTTPException(
                status_code=status.HTTP_412_PRECONDITION_FAILED,
                detail="No default workspace found.  Complete onboarding first.",
            )

        resolved_root = await asyncio.to_thread(lambda: Path(ws.path).resolve())
        target = _safe_child(resolved_root, file_path)

        if not await asyncio.to_thread(target.exists):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        if await asyncio.to_thread(target.is_dir):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Path is a directory, not a file",
            )

        mime, _ = mimetypes.guess_type(str(target))
        filename = await asyncio.to_thread(lambda: target.name)
        return FileResponse(
            path=str(target),
            media_type=mime or "application/octet-stream",
            filename=filename,
        )

    return router
