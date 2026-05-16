"""Service helpers for the third-party messaging channel binding flow.

REBUILD STUB — bean ``pawrrtal-ei4l`` (Phase 3) has the full spec.

Two responsibilities once rebuilt: (1) the short-lived one-time code
handshake; (2) the persistent identity map plus the conversation routing
the bot reads on every inbound message.
"""

import uuid

from sqlalchemy.ext.asyncio.session import AsyncSession
from sqlalchemy.sql import select

from app.models import ChannelBinding, ChannelLinkCode


async def get_channel_bindings_service(
    user_id: uuid.UUID, session: AsyncSession
) -> list[ChannelBinding]:
    """Return all channel bindings owned by the user, oldest first."""
    result = await session.execute(
        select(ChannelBinding)
        .where(ChannelBinding.user_id == user_id)
        .order_by(ChannelBinding.created_at.desc())
    )
    return list(result.scalars().all())


async def get_binding_service(
    user_id: uuid.UUID, session: AsyncSession, provider: str
) -> ChannelBinding | None:
    """Get a channel binding for a given user and provider. Useful to check if a binding exists for a given provider for a given user."""
    result = await session.execute(
        select(ChannelBinding)
        .where(ChannelBinding.user_id == user_id)
        .where(ChannelBinding.provider == provider)
    )
    return result.scalar_one_or_none()


async def delete_binding_service(user_id: uuid.UUID, session: AsyncSession, provider: str) -> bool:
    """Delete a channel binding for a given user and provider. Useful to unlink a channel for a given user."""
    binding = await get_binding_service(user_id=user_id, session=session, provider=provider)
    # Return False if the binding does not exist.
    if binding is None:
        return False
    # Delete the binding.
    await session.delete(binding)
    await session.commit()
    # Return True if the binding was deleted.
    return True


async def issue_link_code_service(
    user_id: uuid.UUID, session: AsyncSession, provider: str
) -> ChannelLinkCode:
    """Issue a link code for a given user and provider. Useful to link a channel for a given user."""
    # Generate a random code.

    # TODO: need to actually generate the code and pass the properties.
    link_code: ChannelLinkCode = ChannelLinkCode()
    return link_code


# TODO(pawrrtal-ei4l): codes are short and from a small alphabet — short
#   enough to type, small enough to brute-force offline if you store
#   them naively. Pick the storage primitive that defeats offline
#   grinding even with a leaked DB.

# TODO(pawrrtal-ei4l): the code alphabet matters. Think about what
#   happens at a support ticket when someone insists they typed it
#   correctly.

# TODO(pawrrtal-ei4l): redemption has multiple failure modes (missing,
#   expired, already used, wrong provider). The bot sees all of them
#   as the same reply. Why?

# TODO(pawrrtal-ei4l): what happens if a user unbinds and rebinds the
#   same Telegram account? Two rows in the bindings table would race for
#   "which Nexus user is this Telegram user?". Plan the merge path.

# TODO(pawrrtal-ei4l): the get-or-create for the Telegram conversation
#   has two branches — Telegram forum topics get their own row per
#   thread, plain DMs reuse one row. The "find existing" query for DMs
#   is non-obvious once the auto-title bean overwrites the title.

# TODO(pawrrtal-ei4l): one of the helpers is hit on every inbound
#   message — it should be a single indexed lookup, not a row fetch.

# TODO(pawrrtal-ei4l): there's a helper for clearing the per-conversation
#   model override. The auto-clear safety net in Phase 11 needs it; the
#   /model handler needs to set it. Same signature, both directions.
