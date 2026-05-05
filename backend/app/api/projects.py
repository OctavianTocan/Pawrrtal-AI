"""HTTP endpoints for project management."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.project import (
    create_project_service,
    delete_project_service,
    list_projects_service,
    update_project_service,
)
from app.db import User, get_async_session
from app.schemas import ProjectCreate, ProjectResponse, ProjectUpdate
from app.users import current_active_user


def _serialize(project: object) -> ProjectResponse:
    """Build a {@link ProjectResponse} from a Project ORM row."""
    return ProjectResponse(
        id=project.id,
        user_id=project.user_id,
        name=project.name,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


def get_projects_router() -> APIRouter:
    """Build the projects router."""
    router = APIRouter(prefix="/api/v1/projects", tags=["projects"])

    @router.get("", response_model=list[ProjectResponse])
    async def list_projects(
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ) -> list[ProjectResponse]:
        """List every project owned by the authenticated user."""
        projects = await list_projects_service(user.id, session)
        return [_serialize(project) for project in projects]

    @router.post("", response_model=ProjectResponse, status_code=201)
    async def create_project(
        payload: ProjectCreate,
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ) -> ProjectResponse:
        """Create a new project owned by the authenticated user."""
        project = await create_project_service(user.id, session, payload)
        return _serialize(project)

    @router.patch("/{project_id}", response_model=ProjectResponse)
    async def update_project(
        project_id: uuid.UUID,
        payload: ProjectUpdate,
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ) -> ProjectResponse:
        """Rename a project (currently the only mutable field)."""
        project = await update_project_service(
            payload=payload,
            user_id=user.id,
            project_id=project_id,
            session=session,
        )
        if project is None:
            raise HTTPException(status_code=404, detail="Project not found")
        return _serialize(project)

    @router.delete("/{project_id}", status_code=204)
    async def delete_project(
        project_id: uuid.UUID,
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ) -> None:
        """Delete a project. Linked conversations are unlinked, not deleted."""
        deleted = await delete_project_service(user.id, session, project_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Project not found")

    return router
