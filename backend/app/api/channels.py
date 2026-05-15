"""HTTP endpoints for the third-party messaging channel binding flow.

REBUILD STUB — bean ``pawrrtal-1irw`` (Phase 4) has the full spec.

The frontend depends on the response shapes here. Don't ship from
imagination; look at what ``frontend/lib/channels.ts`` reads.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio.session import AsyncSession

from app.crud.channel import get_channel_bindings_service
from app.db import User, get_async_session
from app.schemas import ChannelBindingRead
from app.users import get_allowed_user


def get_channels_router() -> APIRouter:
    """Build the channels router (mounted at ``/api/v1/channels``)."""
    router = APIRouter(prefix="/api/v1/channels", tags=["channels"])

    @router.get("", response_model=list[ChannelBindingRead])
    async def list_channels(
        user: User = Depends(get_allowed_user),
        session: AsyncSession = Depends(get_async_session),
    ) -> list[ChannelBindingRead]:
        """List the authenticated user's channel bindings."""
        bindings = await get_channel_bindings_service(user.id, session)
        return [ChannelBindingRead.model_validate(binding) for binding in bindings]

    return router


# TODO(pawrrtal-1irw): two response schemas live in `app/schemas.py`,
#   not here. Re-add them there alongside this file's rebuild.

# TODO(pawrrtal-1irw): four routes total. Three the frontend hits, one
#   that only Telegram hits. The Telegram-only one should NOT be in
#   the OpenAPI schema.

# TODO(pawrrtal-1irw): the "channel not configured" branch is a real
#   user-facing state — the frontend has UI for it. Pick a status code
#   the hook can pattern-match on.

# TODO(pawrrtal-1irw): the webhook route has TWO independent guards
#   before it processes the body. What's the failure mode if you only
#   write one? (Hint: even with a perfect secret check, a polling
#   deployment shouldn't accept webhooks.)

# TODO(pawrrtal-1irw): unlinking is idempotent. The frontend doesn't
#   precheck state before hitting Disconnect. Status code should reflect
#   that.

# TODO(pawrrtal-1irw): after rebuilding, re-register in `backend/main.py`
#   — the deletion left a comment marker. Add the import too.
