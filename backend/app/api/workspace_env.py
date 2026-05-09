"""HTTP endpoints for per-user workspace environment variables.

Workspace env files live at ``/workspace/{user_id}/.env`` (encrypted at rest)
and allow users to override gateway-level settings (e.g. their own GEMINI_API_KEY)
without modifying the server's global .env.

Mounted at: /api/v1/workspace
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.db import User
from app.users import current_active_user

from app.core.providers.keys import (
    OVERRIDABLE_KEYS,
    load_workspace_env,
    save_workspace_env,
)

MAX_KEYS = 10
MAX_VALUE_LENGTH = 512


class WorkspaceEnvVars(BaseModel):
    vars: dict[str, str] = Field(
        default_factory=dict,
        description="Mapping of workspace env key names to their values. "
        "Unknown keys are rejected with 400.",
    )


class WorkspaceEnvResponse(BaseModel):
    vars: dict[str, str] = Field(
        default_factory=dict,
        description="All overridable workspace env keys. "
        "Keys not yet set by the user have an empty-string value.",
    )


def get_workspace_env_router() -> APIRouter:
    router = APIRouter(prefix="/api/v1/workspace", tags=["workspace-env"])

    @router.get("/env", response_model=WorkspaceEnvResponse)
    async def get_workspace_env(
        user: User = Depends(current_active_user),
    ) -> WorkspaceEnvResponse:
        env = load_workspace_env(user.id)
        result: dict[str, str] = {k: env.get(k, "") for k in OVERRIDABLE_KEYS}
        return WorkspaceEnvResponse(vars=result)

    @router.put("/env", response_model=WorkspaceEnvResponse)
    async def put_workspace_env(
        payload: WorkspaceEnvVars,
        user: User = Depends(current_active_user),
    ) -> WorkspaceEnvResponse:
        if len(payload.vars) > MAX_KEYS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Too many keys: maximum is {MAX_KEYS}.",
            )
        for k, v in payload.vars.items():
            if k not in OVERRIDABLE_KEYS:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unknown workspace env key: '{k}'. "
                    f"Allowed keys: {sorted(OVERRIDABLE_KEYS)}.",
                )
            if len(v) > MAX_VALUE_LENGTH:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Value for '{k}' exceeds {MAX_VALUE_LENGTH} characters.",
                )
        existing = load_workspace_env(user.id)
        existing.update(payload.vars)
        save_workspace_env(user.id, existing)
        result = {k: existing.get(k, "") for k in OVERRIDABLE_KEYS}
        return WorkspaceEnvResponse(vars=result)

    @router.delete("/env/{key}", status_code=status.HTTP_204_NO_CONTENT)
    async def delete_workspace_env_key(
        key: str,
        user: User = Depends(current_active_user),
    ) -> None:
        if key not in OVERRIDABLE_KEYS:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Unknown workspace env key: '{key}'.",
            )
        existing = load_workspace_env(user.id)
        existing.pop(key, None)
        save_workspace_env(user.id, existing)

    return router
