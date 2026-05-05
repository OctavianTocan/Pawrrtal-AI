"""aiogram-backed Telegram bot service.

Thin glue between aiogram's ``Bot`` + ``Dispatcher`` and the framework-free
handlers in :mod:`app.integrations.telegram.handlers`. Two boot modes:

- **polling** (default; works on a laptop with no inbound connectivity):
  the FastAPI lifespan launches a background task that calls
  ``Dispatcher.start_polling``. No tunnel, no ngrok, no webhook URL.

- **webhook** (production): the lifespan registers the webhook with
  Telegram on startup and the FastAPI app exposes a route that aiogram
  feeds via ``feed_webhook_update``. Set
  ``TELEGRAM_MODE=webhook`` + ``TELEGRAM_WEBHOOK_URL`` to enable.

Both paths share the same handler functions, so anything we test for
polling automatically covers webhook.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import TYPE_CHECKING

from app.core.config import settings
from app.db import async_session_maker
from app.integrations.telegram.handlers import (
    TelegramSender,
    handle_plain_message,
    handle_start_command,
)

if TYPE_CHECKING:
    from aiogram import Bot, Dispatcher
    from aiogram.types import Message, Update

logger = logging.getLogger(__name__)


@dataclass
class TelegramService:
    """Holds the aiogram primitives so the lifespan can stop them cleanly."""

    bot: "Bot"
    dispatcher: "Dispatcher"
    polling_task: asyncio.Task[None] | None = None

    async def feed_webhook_update(self, update: "Update") -> None:
        """Hand a single ``Update`` parsed from the webhook body to aiogram.

        Used by the FastAPI webhook route in production. Polling does
        not call this — aiogram's polling loop owns its own dispatch.
        """
        await self.dispatcher.feed_update(self.bot, update)


def build_telegram_service() -> "TelegramService":
    """Construct the aiogram primitives and register the dispatcher routes.

    Raises ``RuntimeError`` if Telegram support is not configured. The
    lifespan checks the same gate before calling this so the import
    never blows up a deployment that simply doesn't use the channel.
    """
    # Local import: aiogram is only needed when the channel is wired up,
    # so a deployment without TELEGRAM_BOT_TOKEN never pays the cost.
    from aiogram import Bot, Dispatcher  # noqa: PLC0415
    from aiogram.client.default import DefaultBotProperties  # noqa: PLC0415
    from aiogram.enums import ParseMode  # noqa: PLC0415
    from aiogram.filters import CommandStart  # noqa: PLC0415

    if not settings.telegram_bot_token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN must be set to start the Telegram service.")

    bot = Bot(
        token=settings.telegram_bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dispatcher = Dispatcher()

    @dispatcher.message(CommandStart(deep_link=True))
    @dispatcher.message(CommandStart())
    async def _on_start(message: "Message") -> None:
        sender = _sender_from_message(message)
        # aiogram exposes the deep-link argument via `command.args` on
        # the parsed CommandObject, but using `message.text` keeps the
        # handler robust if a user manually types `/start ABC123`.
        payload = _extract_start_payload(message.text or "")
        async with async_session_maker() as session:
            reply = await handle_start_command(
                sender=sender, payload=payload, session=session
            )
        await message.answer(reply)

    @dispatcher.message()
    async def _on_message(message: "Message") -> None:
        if not message.text:
            return
        sender = _sender_from_message(message)
        async with async_session_maker() as session:
            reply = await handle_plain_message(
                sender=sender, text=message.text, session=session
            )
        await message.answer(reply)

    return TelegramService(bot=bot, dispatcher=dispatcher)


def _sender_from_message(message: "Message") -> TelegramSender:
    """Project an aiogram ``Message`` onto our framework-free dataclass."""
    user = message.from_user
    if user is None:
        # Telegram only delivers `from_user=None` for anonymous channel
        # posts, which we don't care about here.
        raise RuntimeError("Telegram message has no from_user; refusing to dispatch.")
    return TelegramSender(
        user_id=user.id,
        chat_id=message.chat.id,
        username=user.username,
        full_name=user.full_name,
    )


def _extract_start_payload(text: str) -> str | None:
    """Return the argument after ``/start`` (Telegram deep-link payload), if any."""
    parts = text.strip().split(maxsplit=1)
    if len(parts) < 2:
        return None
    return parts[1].strip() or None


@asynccontextmanager
async def telegram_lifespan() -> AsyncIterator[TelegramService | None]:
    """Lifespan-friendly context manager that boots + tears down the bot.

    Yields ``None`` when Telegram is intentionally disabled (no bot
    token) so callers can ``async with`` unconditionally without the
    callsite branching on configuration. Yields a live ``TelegramService``
    otherwise — and ensures the polling task or webhook registration is
    properly cleaned up on shutdown.
    """
    if not settings.telegram_bot_token:
        logger.info("TELEGRAM_DISABLED reason=no_token")
        yield None
        return

    service = build_telegram_service()

    if settings.telegram_mode == "polling":
        # Drop any leftover webhook so polling actually receives updates;
        # Telegram silently swallows getUpdates calls when a webhook is
        # set, which is one of the most painful local-dev footguns.
        await service.bot.delete_webhook(drop_pending_updates=True)
        logger.info("TELEGRAM_BOOT mode=polling")
        service.polling_task = asyncio.create_task(
            service.dispatcher.start_polling(service.bot, handle_signals=False),
            name="telegram-polling",
        )
    else:
        url = settings.telegram_webhook_url
        if not url:
            raise RuntimeError(
                "TELEGRAM_MODE=webhook requires TELEGRAM_WEBHOOK_URL to be set."
            )
        secret = settings.telegram_webhook_secret or None
        await service.bot.set_webhook(
            url=url,
            secret_token=secret,
            drop_pending_updates=True,
        )
        logger.info("TELEGRAM_BOOT mode=webhook url=%s", url)

    try:
        yield service
    finally:
        if service.polling_task is not None:
            service.polling_task.cancel()
            try:
                await service.polling_task
            except (asyncio.CancelledError, Exception):  # noqa: BLE001
                pass
        try:
            await service.bot.session.close()
        except Exception:  # noqa: BLE001
            logger.warning("TELEGRAM_SHUTDOWN session_close_failed", exc_info=True)
