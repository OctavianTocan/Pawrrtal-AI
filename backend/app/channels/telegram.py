"""TelegramChannel — progressive message-edit delivery via aiogram.

Unlike SSEChannel, which pushes bytes to an HTTP transport, TelegramChannel
delivers by calling ``bot.edit_message_text`` as chunks arrive.  There is no
byte stream to return — delivery is entirely a side-effect.  The method is
still typed as ``AsyncIterator[bytes]`` (the Channel protocol's common
denominator) and simply yields nothing.

Delivery contract
-----------------
The caller (bot.py's ``_on_message`` dispatcher function) is responsible for:

1. Sending the initial placeholder message (``"⏳"``) and capturing its
   ``message_id``.
2. Building a ``ChannelMessage`` with the following ``metadata`` keys:

   - ``bot``: the live ``aiogram.Bot`` instance.
   - ``chat_id``: Telegram chat ID (int or str).
   - ``message_id``: ID of the placeholder message to edit progressively.

3. Calling ``channel.deliver(provider.stream(...), channel_msg)`` and
   consuming the resulting async iterator to drive delivery:
   ``async for _ in channel.deliver(...): pass``.

Debounce
--------
Telegram's flood control allows roughly 20 edits per minute per chat (one
every ~3 seconds).  We debounce by *character growth*: an edit is sent when
either ``_EDIT_DEBOUNCE_CHARS`` new characters have accumulated **or**
``_MAX_EDIT_INTERVAL`` seconds have elapsed since the last edit.  A final
edit is always sent after the stream ends to ensure the user sees the
complete text.

Error handling
--------------
``TelegramBadRequest: message is not modified`` is swallowed — it's benign
and happens when the model emits an empty delta between two flush points.
All other errors are logged as warnings but do not raise; a partial response
visible to the user is better than a silent failure.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator
from typing import TYPE_CHECKING, Any

from app.core.providers.base import StreamEvent

from .base import ChannelMessage

if TYPE_CHECKING:
    from aiogram import Bot

logger = logging.getLogger(__name__)

SURFACE_TELEGRAM = "telegram"

# Send an edit when this many new characters have accumulated since the last
# edit.  Keeps the perceived update cadence snappy without hammering the API.
_EDIT_DEBOUNCE_CHARS = 40

# Hard upper bound between edits in wall-clock seconds.  Ensures the user
# sees *something* change even when the model emits many tiny tokens.
_MAX_EDIT_INTERVAL_S = 3.0

# Maximum Telegram message length.  We truncate rather than split for now;
# splitting is a future concern.
_MAX_MESSAGE_LEN = 4096


class TelegramChannel:
    """``Channel`` implementation for Telegram, using aiogram message edits.

    Instantiated once and shared across requests — it holds no per-request
    state.  All per-request context (bot reference, chat/message IDs) travels
    through ``ChannelMessage.metadata``.
    """

    surface: str = SURFACE_TELEGRAM

    async def deliver(
        self,
        stream: AsyncIterator[StreamEvent],
        message: ChannelMessage,
    ) -> AsyncIterator[bytes]:
        """Consume LLM events and edit the Telegram placeholder progressively.

        Expected ``message["metadata"]`` keys:

        - ``bot`` (``aiogram.Bot``): live bot instance.
        - ``chat_id`` (``int | str``): target Telegram chat.
        - ``message_id`` (``int``): placeholder message to overwrite.

        Yields nothing — all delivery is via side-effect (``edit_message_text``).

        Args:
            stream: Async iterator of ``StreamEvent`` dicts from the LLM.
            message: Originating ``ChannelMessage`` — metadata carries the
                     Telegram-specific routing context.
        """
        meta: dict[str, Any] = message["metadata"]
        bot: Bot = meta["bot"]
        chat_id = meta["chat_id"]
        message_id: int = meta["message_id"]

        accumulated = ""
        chars_since_edit = 0
        last_edit_at = asyncio.get_event_loop().time()

        async for event in stream:
            if event.get("type") == "delta":
                chunk: str = event.get("content", "")
                accumulated += chunk
                chars_since_edit += len(chunk)

                now = asyncio.get_event_loop().time()
                elapsed = now - last_edit_at

                should_edit = (
                    chars_since_edit >= _EDIT_DEBOUNCE_CHARS
                    or elapsed >= _MAX_EDIT_INTERVAL_S
                )
                if should_edit and accumulated:
                    await _safe_edit(bot, chat_id, message_id, accumulated)
                    chars_since_edit = 0
                    last_edit_at = now

        # Final edit — always flush whatever text remains so the user sees the
        # complete response even if the last chunk didn't cross the debounce
        # threshold.
        if accumulated:
            await _safe_edit(bot, chat_id, message_id, accumulated)

        # No bytes to yield — delivery is a side-effect only.
        return
        # The bare ``yield`` below is unreachable but required: it makes
        # this function an async generator (the Channel.deliver protocol
        # signature), so callers can ``async for`` over it even though we
        # only ever side-effect through ``edit_message_text``.
        yield


async def _safe_edit(
    bot: "Bot",
    chat_id: int | str,
    message_id: int,
    text: str,
) -> None:
    """Call ``edit_message_text``, swallowing benign Telegram errors.

    Args:
        bot: Live aiogram Bot instance.
        chat_id: Target Telegram chat ID.
        message_id: ID of the message to edit.
        text: Full text to set (not a delta — always the accumulated string).
    """
    # Truncate to Telegram's hard limit; future work can paginate.
    if len(text) > _MAX_MESSAGE_LEN:
        text = text[: _MAX_MESSAGE_LEN - 1] + "…"

    try:
        await bot.edit_message_text(
            chat_id=chat_id,
            message_id=message_id,
            text=text,
        )
    except Exception as exc:  # noqa: BLE001
        err_str = str(exc).lower()
        if "not modified" in err_str:
            # Benign — model emitted an empty delta, nothing changed.
            return
        logger.warning(
            "TELEGRAM_EDIT_FAILED chat_id=%s message_id=%s error=%s",
            chat_id,
            message_id,
            exc,
        )
