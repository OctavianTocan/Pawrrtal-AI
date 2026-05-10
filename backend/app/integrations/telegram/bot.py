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
from pathlib import Path
from typing import TYPE_CHECKING

from app.channels import ChannelMessage, resolve_channel
from app.channels.telegram import SURFACE_TELEGRAM
from app.core.config import settings
from app.core.providers import resolve_llm
from app.db import async_session_maker
from app.integrations.telegram.handlers import (
    TelegramSender,
    TelegramTurnContext,
    handle_model_command,
    handle_plain_message,
    handle_start_command,
    handle_stop_command,
)

if TYPE_CHECKING:
    from aiogram import Bot, Dispatcher
    from aiogram.types import Message, Update

logger = logging.getLogger(__name__)

# Active streaming tasks keyed by Telegram chat_id.  When a new message
# arrives we cancel any existing task for that chat (preventing two parallel
# streams into the same placeholder message), then store the new one so
# a subsequent /stop can cancel it.
#
# IMPORTANT — this dict is PROCESS-LOCAL.  A /stop arriving on worker A
# cannot cancel a task running on worker B.  This is correct for the current
# single-worker deployment; promote to a shared store (e.g. Redis pub/sub)
# before running multiple uvicorn workers.
_running_tasks: dict[int, asyncio.Task[None]] = {}


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
    from aiogram.filters import Command, CommandStart  # noqa: PLC0415

    if not settings.telegram_bot_token:
        raise RuntimeError(
            "TELEGRAM_BOT_TOKEN must be set to start the Telegram service."
        )

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

    @dispatcher.message(Command("stop"))
    async def _on_stop(message: "Message") -> None:
        chat_id = message.chat.id
        task = _running_tasks.pop(chat_id, None)
        was_running = task is not None and not task.done()
        if was_running:
            task.cancel()  # type: ignore[union-attr]
        # handle_stop_command is a plain sync function — no await.
        reply = handle_stop_command(was_running=was_running)
        await message.answer(reply)

    @dispatcher.message(Command("model"))
    async def _on_model(message: "Message") -> None:
        text = message.text or ""
        # Strip the "/model" prefix (plus optional @botname) and grab the rest.
        parts = text.strip().split(maxsplit=1)
        model_arg = parts[1].strip() if len(parts) > 1 else ""
        sender = _sender_from_message(message)
        async with async_session_maker() as session:
            reply = await handle_model_command(
                sender=sender, model_arg=model_arg, session=session
            )
        await message.answer(reply)

    @dispatcher.message()
    async def _on_message(message: "Message") -> None:
        if not message.text:
            return
        sender = _sender_from_message(message)
        async with async_session_maker() as session:
            result = await handle_plain_message(
                sender=sender, text=message.text, session=session
            )

        if isinstance(result, str):
            # Terminal reply — user isn't bound or some other error.
            await message.answer(result)
            return

        # LLM turn — send a placeholder, then stream edits into it.
        context: TelegramTurnContext = result
        thinking_msg = await message.answer("⏳")

        # Resolve the user's default workspace so the agent has filesystem
        # access.  If onboarding hasn't completed (no workspace), we fall
        # back to an empty tool list so the turn still works.
        from app.core.agent_tools import build_agent_tools  # noqa: PLC0415
        from app.channels.telegram import make_telegram_sender  # noqa: PLC0415
        from app.crud.workspace import get_default_workspace  # noqa: PLC0415

        async with async_session_maker() as ws_session:
            workspace = await get_default_workspace(context.nexus_user_id, ws_session)

        tg_sender = make_telegram_sender(
            message.bot,
            message.chat.id,
            message_thread_id=context.thread_id,
        )
        agent_tools = (
            build_agent_tools(
                workspace_root=Path(workspace.path),
                user_id=context.nexus_user_id,
                send_fn=tg_sender,
            )
            if workspace is not None
            else []
        )

        channel_message: ChannelMessage = {
            "user_id": context.nexus_user_id,
            "conversation_id": context.conversation_id,
            "text": message.text,
            "surface": SURFACE_TELEGRAM,
            "model_id": context.model_id,
            "metadata": {
                "bot": message.bot,
                "chat_id": message.chat.id,
                "message_id": thinking_msg.message_id,
            },
        }

        provider = resolve_llm(context.model_id)
        channel = resolve_channel(SURFACE_TELEGRAM)

        async def _do_stream() -> None:
            raw_stream = provider.stream(
                message.text,
                context.conversation_id,
                context.nexus_user_id,
                history=[],
                tools=agent_tools or None,
            )
            async for _ in channel.deliver(raw_stream, channel_message):
                pass  # delivery is a side-effect; nothing yielded by TelegramChannel

        # Cancel any previous stream for this chat before starting the new one.
        chat_id = message.chat.id
        old_task = _running_tasks.pop(chat_id, None)
        if old_task is not None and not old_task.done():
            old_task.cancel()

        task: asyncio.Task[None] = asyncio.create_task(_do_stream())
        _running_tasks[chat_id] = task
        try:
            await task
        except asyncio.CancelledError:
            logger.info("TELEGRAM_STREAM_CANCELLED chat_id=%s", chat_id)
        finally:
            _running_tasks.pop(chat_id, None)

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
        # Bot API 9.3+: present when the message lives in a topic thread.
        # None for ordinary DMs without topics enabled.
        thread_id=message.message_thread_id,
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
