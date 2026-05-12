"""HTTP endpoints for user preferences (TOML-backed in the workspace).

Preferences live as ``preferences.toml`` in the user's default workspace
directory.  The agent can read and write the same file directly via the
``workspace_files`` tool — so users can update their preferences from
any surface (web Settings UI, Telegram conversation, Electron app)
without separate endpoints.

The endpoint shape is unchanged from the previous DB-backed version
*minus* the ``personality`` field — agent personality lives in
``SOUL.md`` (also workspace-editable) and not in a wizard preset.
"""

from __future__ import annotations

import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.preferences import read_preferences, write_preferences
from app.crud.workspace import ensure_default_workspace
from app.db import User, get_async_session
from app.schemas import PersonalizationProfile
from app.users import current_active_user

log = logging.getLogger(__name__)


def _profile_from_toml(data: dict) -> PersonalizationProfile:
    """Project a parsed TOML dict onto the response schema."""
    identity = data.get("identity") or {}
    context = data.get("context") or {}
    goals = data.get("goals") or {}
    channels = data.get("channels") or {}
    return PersonalizationProfile(
        name=identity.get("name"),
        company_website=identity.get("company_website"),
        linkedin=identity.get("linkedin"),
        role=identity.get("role"),
        goals=goals.get("items"),
        connected_channels=channels.get("connected"),
        chatgpt_context=context.get("chatgpt_context"),
        custom_instructions=context.get("custom_instructions"),
    )


def _profile_to_toml(profile: PersonalizationProfile) -> dict:
    """Project the request payload back to the canonical TOML shape.

    Empty / None fields are dropped at write time by
    ``preferences.write_preferences`` so the on-disk file stays clean.
    """
    return {
        "identity": {
            "name": profile.name,
            "role": profile.role,
            "company_website": profile.company_website,
            "linkedin": profile.linkedin,
        },
        "context": {
            "chatgpt_context": profile.chatgpt_context,
            "custom_instructions": profile.custom_instructions,
        },
        "goals": {"items": profile.goals},
        "channels": {"connected": profile.connected_channels},
    }


def get_personalization_router() -> APIRouter:
    """Build the personalization router (mounted at /api/v1/personalization)."""
    router = APIRouter(prefix="/api/v1/personalization", tags=["personalization"])

    @router.get("", response_model=PersonalizationProfile)
    async def get_personalization(
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ) -> PersonalizationProfile:
        """Return the authenticated user's preferences from the workspace TOML.

        Returns an empty profile when the user has no workspace yet OR no
        preferences file — the frontend treats both as "render placeholders".
        """
        workspace = await ensure_default_workspace(user_id=user.id, session=session)
        await session.commit()
        return _profile_from_toml(read_preferences(Path(workspace.path)))

    @router.put("", response_model=PersonalizationProfile)
    async def upsert_personalization(
        payload: PersonalizationProfile,
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ) -> PersonalizationProfile:
        """Replace the user's preferences with the payload (full-replace PUT).

        Also ensures the default workspace exists on first call — same
        trigger as before, just routed through the TOML helper instead of
        a database row.
        """
        workspace = await ensure_default_workspace(user_id=user.id, session=session)
        await session.commit()

        try:
            write_preferences(Path(workspace.path), _profile_to_toml(payload))
        except OSError as exc:
            log.exception("Failed to write preferences.toml for user %s", user.id)
            raise HTTPException(
                status_code=500,
                detail="Failed to persist preferences to the workspace.",
            ) from exc

        return _profile_from_toml(read_preferences(Path(workspace.path)))

    return router
