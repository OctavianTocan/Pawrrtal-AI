"""HTTP endpoints for the home-page personalization wizard."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.personalization import (
    get_personalization_service,
    upsert_personalization_service,
)
from app.db import User, get_async_session
from app.models import UserPersonalization
from app.schemas import PersonalizationProfile
from app.users import current_active_user


def _to_profile(row: UserPersonalization | None) -> PersonalizationProfile:
    """Convert the ORM row (or absence) to the response schema.

    Returns an empty profile when the user hasn't filled in the wizard
    yet — the frontend treats this as "no defaults yet, render placeholders".
    """
    if row is None:
        return PersonalizationProfile()
    return PersonalizationProfile(
        name=row.name,
        company_website=row.company_website,
        linkedin=row.linkedin,
        role=row.role,
        goals=row.goals,
        connected_channels=row.connected_channels,
        chatgpt_context=row.chatgpt_context,
        personality=row.personality,
        custom_instructions=row.custom_instructions,
    )


def get_personalization_router() -> APIRouter:
    """Build the personalization router (mounted at /api/v1/personalization)."""
    router = APIRouter(prefix="/api/v1/personalization", tags=["personalization"])

    @router.get("", response_model=PersonalizationProfile)
    async def get_personalization(
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ) -> PersonalizationProfile:
        """Return the authenticated user's personalization profile."""
        row = await get_personalization_service(user.id, session)
        return _to_profile(row)

    @router.put("", response_model=PersonalizationProfile)
    async def upsert_personalization(
        payload: PersonalizationProfile,
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ) -> PersonalizationProfile:
        """Create or replace the authenticated user's personalization profile."""
        row = await upsert_personalization_service(
            user_id=user.id, payload=payload, session=session
        )
        return _to_profile(row)

    return router
