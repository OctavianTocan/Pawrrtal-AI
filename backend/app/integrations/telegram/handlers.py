"""Inbound message handlers for the Telegram channel adapter.

Kept deliberately framework-thin so the same logic can be exercised from a
unit test without spinning up aiogram.  Each handler returns either a plain
string (for terminal error replies the bot sends immediately) or a
``TelegramTurnContext`` when the message should be routed to the LLM pipeline.

The split is what makes Telegram features testable locally — see
``tests/integrations/test_telegram.py``.

Handler states
--------------
1. The user sent ``/start <code>`` — redeem the code and confirm the bind.
2. The user sent a plain message **and** has a binding — return a
   ``TelegramTurnContext`` so ``bot.py`` can route to the LLM via the
   channel abstraction.
3. The user sent a plain message but is **not** bound — return the
   onboarding nudge string.
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.channel import (
    get_or_create_telegram_conversation,
    get_user_id_for_external,
    redeem_link_code,
)

logger = logging.getLogger(__name__)

PROVIDER = "telegram"

# Default model used when the conversation has no stored override.
_DEFAULT_MODEL = "gemini-3-flash-preview"

# Reply strings — centralized here so copy review doesn't require tracing
# through the dispatcher.
_NOT_BOUND_MESSAGE = (
    "Hey 👋 I don't recognize this Telegram account yet.\n\n"
    "To connect it, log in on the web app, open Settings → Channels, "
    "click 'Connect Telegram', and either tap the deep link or send me "
    "the code you'll see there."
)
_BIND_OK_MESSAGE = "Connected ✅ — you can now chat with Nexus from here."
_BIND_BAD_CODE_MESSAGE = (
    "That code didn't work. It may have expired (codes live for 10 minutes) "
    "or already been used. Generate a fresh one from Settings → Channels."
)


@dataclass(frozen=True)
class TelegramSender:
    """Stable subset of an aiogram ``Message.from_user`` we need.

    Modeled as a plain dataclass so handler tests don't have to import aiogram
    or build a fake bot.
    """

    user_id: int
    chat_id: int
    username: str | None
    full_name: str | None


@dataclass(frozen=True)
class TelegramTurnContext:
    """Resolved context for routing a Telegram message to the LLM pipeline.

    Returned by ``handle_plain_message`` when the sender has a valid binding.
    ``bot.py`` uses this to build the ``ChannelMessage`` and invoke the
    channel delivery loop.
    """

    nexus_user_id: uuid.UUID
    """Nexus user UUID resolved from the channel binding."""

    conversation_id: uuid.UUID
    """Stable Nexus conversation for this Telegram user."""

    model_id: str
    """Model to use for this turn (default or conversation override)."""


async def handle_start_command(
    *,
    sender: TelegramSender,
    payload: str | None,
    session: AsyncSession,
) -> str:
    """Process ``/start`` (with or without a binding code) inbound update.

    When a code is included (Telegram delivers the deep-link argument as the
    first text after ``/start``), redeem it and produce the bind confirmation.
    Without one, fall back to the not-bound nudge.

    Args:
        sender: Normalized sender identity.
        payload: Text after ``/start``, if any (the binding code).
        session: Async database session.

    Returns:
        Reply string the bot should send immediately.
    """
    code = (payload or "").strip()
    if not code:
        return _NOT_BOUND_MESSAGE

    binding = await redeem_link_code(
        code=code,
        provider=PROVIDER,
        external_user_id=str(sender.user_id),
        external_chat_id=str(sender.chat_id),
        display_handle=sender.username or sender.full_name,
        session=session,
    )
    if binding is None:
        return _BIND_BAD_CODE_MESSAGE

    logger.info(
        "TELEGRAM_BIND_OK external_user_id=%s nexus_user_id=%s",
        sender.user_id,
        binding.user_id,
    )
    return _BIND_OK_MESSAGE


async def handle_plain_message(
    *,
    sender: TelegramSender,
    text: str,
    session: AsyncSession,
) -> str | TelegramTurnContext:
    """Process a non-command message from a Telegram chat.

    Returns a string when the message can be replied to immediately (e.g. the
    user isn't bound yet), or a ``TelegramTurnContext`` when the message
    should be routed to the LLM pipeline.  The bot dispatcher calls this,
    inspects the result, and either sends the string directly or drives the
    channel streaming loop.

    Args:
        sender: Normalized sender identity.
        text: User's message text.
        session: Async database session.

    Returns:
        ``str`` for immediate replies, ``TelegramTurnContext`` for LLM routing.
    """
    nexus_user_id = await get_user_id_for_external(
        provider=PROVIDER,
        external_user_id=str(sender.user_id),
        session=session,
    )
    if nexus_user_id is None:
        return _NOT_BOUND_MESSAGE

    conversation_id = await get_or_create_telegram_conversation(
        user_id=nexus_user_id,
        session=session,
    )

    logger.info(
        "TELEGRAM_TURN user_id=%s conversation_id=%s text_len=%d",
        nexus_user_id,
        conversation_id,
        len(text),
    )

    return TelegramTurnContext(
        nexus_user_id=nexus_user_id,
        conversation_id=conversation_id,
        model_id=_DEFAULT_MODEL,
    )
