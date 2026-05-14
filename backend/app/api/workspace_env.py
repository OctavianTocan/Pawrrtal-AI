"""HTTP endpoints for per-user workspace environment variables.

Workspace env files live at ``{settings.workspace_base_dir}/{user_id}/.env``
(encrypted at rest) and let users override gateway-level settings (e.g.
their own ``GEMINI_API_KEY``) without modifying the server's global ``.env``.

Mounted at: ``/api/v1/workspace``.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from app.core.keys import (
    OVERRIDABLE_KEYS,
    VALUE_FORBIDDEN_CHARS,
    load_workspace_env,
    save_workspace_env,
)
from app.db import User
from app.users import get_allowed_user

# Maximum number of distinct keys a single PUT may set/update. Each user can
# set at most this many overrides regardless of MAX_VALUE_LENGTH; this is a
# safety bound, not a quota — workspace .env files should stay tiny.
MAX_KEYS = 10

# Maximum length of a single overridden value, in characters. Generous enough
# for OAuth tokens and signed JWTs; hard cap so a misbehaving client can't
# silently push megabytes through this endpoint.
MAX_VALUE_LENGTH = 512


class WorkspaceEnvVars(BaseModel):
    """Request body for ``PUT /api/v1/workspace/env``.

    Each entry in ``vars`` overrides the corresponding gateway-level setting.
    Empty-string values are persisted as "absent" (the encrypted file simply
    omits the key) so that clearing a field in the UI reverts to the
    gateway default.
    """

    vars: dict[str, str] = Field(
        default_factory=dict,
        description=(
            "Mapping of workspace env key names to their values. "
            "Unknown keys are rejected with 400. Values must not contain "
            "newline characters."
        ),
    )

    @field_validator("vars")
    @classmethod
    def _reject_newlines(cls, v: dict[str, str]) -> dict[str, str]:
        """Reject any value containing CR or LF.

        The on-disk format is one ``KEY=value`` per line, so a value
        containing a newline would split into a second key=value pair on
        the next read — letting a user with one writable key inject
        arbitrary other keys (e.g. ``GEMINI_API_KEY=...\\nEXA_API_KEY=hijack``).
        Rejection at validation time is the only safe enforcement boundary
        because the serialiser does no escaping.
        """
        for key, value in v.items():
            if VALUE_FORBIDDEN_CHARS.search(value):
                raise ValueError(
                    f"Value for '{key}' must not contain newline characters."
                )
        return v


class WorkspaceEnvResponse(BaseModel):
    """Response body for ``GET`` and ``PUT /api/v1/workspace/env``.

    Always contains every key in :data:`OVERRIDABLE_KEYS`; keys the user
    has not set are returned with empty-string values so the frontend
    can render every input field without an extra schema fetch.
    """

    vars: dict[str, str] = Field(
        default_factory=dict,
        description=(
            "All overridable workspace env keys. "
            "Keys not yet set by the user have an empty-string value."
        ),
    )


def _all_keys_response(env: dict[str, str]) -> WorkspaceEnvResponse:
    """Project a stored env dict onto the canonical full-key response shape."""
    return WorkspaceEnvResponse(vars={k: env.get(k, "") for k in OVERRIDABLE_KEYS})


def get_workspace_env_router() -> APIRouter:
    """Build the per-user workspace env override router.

    Three endpoints:
      * ``GET  /env`` — return the user's current overrides (with empty-string
        defaults for unset keys).
      * ``PUT  /env`` — merge new overrides on top of existing ones. Empty
        string values are stored as "absent" (the on-disk file omits them).
      * ``DELETE /env/{key}`` — remove a single override, falling back to the
        gateway default for that key.

    All endpoints require an authenticated user.
    """
    router = APIRouter(prefix="/api/v1/workspace", tags=["workspace-env"])

    @router.get("/env", response_model=WorkspaceEnvResponse)
    async def get_workspace_env(
        user: User = Depends(get_allowed_user),
    ) -> WorkspaceEnvResponse:
        """Return the current user's workspace env overrides."""
        return _all_keys_response(load_workspace_env(user.id))

    @router.put("/env", response_model=WorkspaceEnvResponse)
    async def put_workspace_env(
        payload: WorkspaceEnvVars,
        user: User = Depends(get_allowed_user),
    ) -> WorkspaceEnvResponse:
        """Merge ``payload.vars`` into the user's workspace env file.

        Existing keys not mentioned in ``payload.vars`` are preserved
        (PATCH-like semantics, despite the PUT verb — the field-by-field
        UI never sends a full replace). Empty-string values are accepted
        and stored as "absent" so clearing a field in the UI reverts that
        key to the gateway default.
        """
        if len(payload.vars) > MAX_KEYS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Too many keys: maximum is {MAX_KEYS}.",
            )
        for k, v in payload.vars.items():
            if k not in OVERRIDABLE_KEYS:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Unknown workspace env key: '{k}'. "
                        f"Allowed keys: {sorted(OVERRIDABLE_KEYS)}."
                    ),
                )
            if len(v) > MAX_VALUE_LENGTH:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Value for '{k}' exceeds {MAX_VALUE_LENGTH} characters.",
                )
        existing = load_workspace_env(user.id)
        existing.update(payload.vars)
        save_workspace_env(user.id, existing)
        # Re-load from disk so the response reflects what was actually
        # persisted (empty-string values are stripped during save, so the
        # echoed payload should match what subsequent GETs return).
        return _all_keys_response(load_workspace_env(user.id))

    @router.delete("/env/{key}", status_code=status.HTTP_204_NO_CONTENT)
    async def delete_workspace_env_key(
        key: str,
        user: User = Depends(get_allowed_user),
    ) -> None:
        """Remove a single override key for the current user."""
        if key not in OVERRIDABLE_KEYS:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Unknown workspace env key: '{key}'.",
            )
        existing = load_workspace_env(user.id)
        existing.pop(key, None)
        save_workspace_env(user.id, existing)

    return router
