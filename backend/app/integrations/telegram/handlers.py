"""Inbound message handlers for the Telegram channel adapter.

Kept deliberately framework-thin so the same logic can be exercised
from a unit test without spinning up aiogram. Each handler returns
the text the bot should reply with; the caller is responsible for the
actual ``bot.send_message`` call. This split is what makes Telegram
features testable locally — see tests/integrations/test_telegram.py.

The handlers know about three states:

1. The user sent ``/start <code>`` (or ``/start`` then a bare code) —
   redeem the code via :mod:`app.crud.channel` and confirm the bind.
2. The user has an existing binding — the message is forwarded into
   the existing chat service. Today's silver-bullet just acknowledges
   receipt; full streaming + provider routing is BEAN-marked below.
3. The user is unknown — nudge them toward the binding flow.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.channel import get_user_id_for_external, redeem_link_code

logger = logging.getLogger(__name__)

PROVIDER = "telegram"

# Surfaced verbatim in chat. Kept here so copy review can happen
# without touching the dispatcher.
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
_BOUND_ACK_MESSAGE_PREFIX = "Got it. Working on a reply…"


@dataclass(frozen=True)
class TelegramSender:
    """Stable subset of an aiogram ``Message.from_user`` we need.

    Modeled as a plain dataclass so handler tests don't have to import
    aiogram or build a fake bot.
    """

    user_id: int
    chat_id: int
    username: str | None
    full_name: str | None


async def handle_start_command(
    *,
    sender: TelegramSender,
    payload: str | None,
    session: AsyncSession,
) -> str:
    """Process ``/start`` (with or without a binding code) inbound update.

    When a code is included (Telegram delivers the deep-link argument
    as the first text after ``/start``), redeem it and produce the bind
    confirmation. Without one, drop into the standard not-bound nudge.
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
) -> str:
    """Process a non-command message from a Telegram chat.

    For the silver-bullet milestone we just confirm the message was
    received and quote it back — the chat-completion path is wired up
    in a follow-up that threads the existing provider router into the
    adapter without changing this signature.
    """
    user_id = await get_user_id_for_external(
        provider=PROVIDER,
        external_user_id=str(sender.user_id),
        session=session,
    )
    if user_id is None:
        return _NOT_BOUND_MESSAGE

    # BEAN: forward `text` into the chat service for `user_id`, stream
    # the assistant reply into `chat_messages`, and surface the final
    # text via Telegram's edit_message_text loop. Today we acknowledge
    # so the binding round-trip is itself testable end-to-end.
    snippet = text.strip().splitlines()[0][:120] if text.strip() else "(empty message)"
    return f"{_BOUND_ACK_MESSAGE_PREFIX}\n\n> {snippet}"
