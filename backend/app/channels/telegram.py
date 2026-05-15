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
from pathlib import Path
from typing import TYPE_CHECKING, Any

from app.core.providers.base import StreamEvent
from app.core.tools.send_message import SendFn

from .base import ChannelMessage
from .telegram_html import md_to_telegram_html

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
            event_type = event.get("type")
            if event_type == "tool_use":
                # PR 07: inject a one-line glyph + tool name so the
                # user sees what the agent is doing in real time.  We
                # don't include the tool input — it can be large or
                # sensitive — only the name + glyph.  The accumulated
                # buffer flushes on the next debounce tick.
                tool_name = event.get("name", "tool")
                # Lazy import: ``app.integrations.telegram.tool_icons``
                # lives inside the Telegram package whose ``__init__``
                # eagerly imports ``bot.py``, which in turn imports
                # ``app.channels``. Importing it at module scope creates
                # a circular import during ``app.channels`` init.
                from app.integrations.telegram.tool_icons import (  # noqa: PLC0415
                    tool_icon,
                )

                line = f"\n{tool_icon(tool_name)} {tool_name}…"
                accumulated += line
                chars_since_edit += len(line)
                now = asyncio.get_event_loop().time()
                elapsed = now - last_edit_at
                if accumulated and (
                    chars_since_edit >= _EDIT_DEBOUNCE_CHARS or elapsed >= _MAX_EDIT_INTERVAL_S
                ):
                    await _safe_edit(bot, chat_id, message_id, accumulated)
                    chars_since_edit = 0
                    last_edit_at = now
                continue
            if event_type == "delta":
                chunk: str = event.get("content", "")
                accumulated += chunk
                chars_since_edit += len(chunk)

                now = asyncio.get_event_loop().time()
                elapsed = now - last_edit_at

                should_edit = (
                    chars_since_edit >= _EDIT_DEBOUNCE_CHARS or elapsed >= _MAX_EDIT_INTERVAL_S
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
    bot: Bot,
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
    html = md_to_telegram_html(text)

    # Truncate to Telegram's hard limit; future work can paginate.
    if len(html) > _MAX_MESSAGE_LEN:
        html = html[: _MAX_MESSAGE_LEN - 1] + "…"

    try:
        await bot.edit_message_text(
            chat_id=chat_id,
            message_id=message_id,
            text=html,
        )
    except Exception as exc:
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


# ---------------------------------------------------------------------------
# MIME-aware media sender factory
# ---------------------------------------------------------------------------


def make_telegram_sender(
    bot: Bot,
    chat_id: int | str,
    *,
    message_thread_id: int | None = None,
) -> SendFn:
    """Return a :data:`~app.core.tools.send_message.SendFn` for Telegram.

    The returned coroutine routes delivery based on MIME type::

        image/*          → bot.send_photo(file, caption=text)
        audio/ogg        → bot.send_voice(file)          # Telegram renders as voice
        audio/opus       → bot.send_voice(file)
        audio/*          → bot.send_audio(file, caption=text)
        video/*          → bot.send_video(file, caption=text)
        *                → bot.send_document(file, caption=text)

    Text-only calls (no file) fall through to ``bot.send_message``.

    When *message_thread_id* is set every call includes it so the reply
    lands in the correct Telegram topic thread.

    Args:
        bot: Live aiogram ``Bot`` instance.
        chat_id: Target Telegram chat ID.
        message_thread_id: Optional topic thread ID (Bot API 9.3+).
            Pass ``None`` (the default) for DMs without topics enabled.

    Returns:
        An async :data:`~app.core.tools.send_message.SendFn` callback ready
        to pass to :func:`~app.core.tools.send_message.make_send_message_tool`.
    """

    async def _send(
        text: str | None,
        file_path: Path | None,
        mime: str | None,
    ) -> None:
        thread_kwargs: dict[str, Any] = {}
        if message_thread_id is not None:
            thread_kwargs["message_thread_id"] = message_thread_id

        if file_path is None:
            # Text-only delivery.
            await bot.send_message(
                chat_id=chat_id,
                text=md_to_telegram_html(text or ""),
                **thread_kwargs,
            )
            return

        from aiogram.types import FSInputFile  # noqa: PLC0415 — lazy import; aiogram optional

        file = FSInputFile(file_path)
        caption = md_to_telegram_html(text) if text else None
        m = (mime or "").lower()

        if m.startswith("image/"):
            await bot.send_photo(
                chat_id=chat_id,
                photo=file,
                caption=caption,
                **thread_kwargs,
            )
            return
        if m in ("audio/ogg", "audio/opus"):
            # Telegram renders ogg/opus as an in-chat voice note.
            await bot.send_voice(
                chat_id=chat_id,
                voice=file,
                caption=caption,
                **thread_kwargs,
            )
            return
        if m.startswith("audio/"):
            await bot.send_audio(
                chat_id=chat_id,
                audio=file,
                caption=caption,
                **thread_kwargs,
            )
            return
        if m.startswith("video/"):
            await bot.send_video(
                chat_id=chat_id,
                video=file,
                caption=caption,
                **thread_kwargs,
            )
            return
        # Fallback — send as a downloadable document.
        await bot.send_document(
            chat_id=chat_id,
            document=file,
            caption=caption,
            **thread_kwargs,
        )

    return _send
