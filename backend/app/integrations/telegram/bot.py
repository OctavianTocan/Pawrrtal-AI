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
import contextlib
import logging
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

from app.core.config import settings
from app.core.providers import resolve_llm
from app.core.providers.base import AILLM
from app.core.providers.catalog import default_model, require_known
from app.core.providers.model_id import InvalidModelId, UnknownModelId
from app.crud.channel import update_conversation_model
from app.db import async_session_maker
from app.integrations.telegram.handlers import (
    TelegramSender,
    TelegramTurnContext,
    handle_model_command,
    handle_new_command,
    handle_plain_message,
    handle_start_command,
    handle_stop_command,
)
from app.integrations.telegram.turn_stream import stream_persisted_turn

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


async def _resolve_provider_with_auto_clear(
    context: TelegramTurnContext,
) -> tuple[AILLM, str | None]:
    """Resolve a provider for ``context.model_id`` with an auto-clear safety net.

    On either :class:`InvalidModelId` (string doesn't parse) or
    :class:`UnknownModelId` (parses but isn't in the catalog), the stored
    ``conversation.model_id`` is cleared to ``NULL`` so the *next* turn
    reads :func:`catalog.default_model` cleanly — no per-turn-fails-forever
    UX trap — and the current turn falls back to the catalog default.

    Telegram is catalog-ignorant on the write side (``/model`` only runs
    the structural parser, per ADR 2026-05-14 §7), so this is the single
    place where an unknown-but-well-formed stored ID gets surfaced to the
    user.  ``pawrrtal-yea3`` tracks the deferred follow-up that moves the
    catalog check up to ``/model`` time, after which this is a backstop
    rather than the primary error surface.

    Args:
        context: Resolved turn context with the stored ``model_id``.

    Returns:
        A tuple of ``(provider, warning_text_or_None)``.  When the auto-clear
        path fires, ``warning_text`` is a human-readable string the caller
        should send to the user before streaming.  When the stored ID is
        valid, ``warning_text`` is ``None``.
    """
    try:
        require_known(context.model_id)
        provider = resolve_llm(context.model_id, user_id=context.nexus_user_id)
    except (InvalidModelId, UnknownModelId) as exc:
        fallback_id = default_model().id
        warning = (
            f"Model <code>{context.model_id}</code> isn't usable: {exc}. "
            f"Switching you back to the default ({fallback_id})."
        )
        async with async_session_maker() as session:
            await update_conversation_model(
                conversation_id=context.conversation_id,
                model_id=None,
                session=session,
            )
        logger.info(
            "TELEGRAM_MODEL_AUTO_CLEAR conversation_id=%s bad_model=%s",
            context.conversation_id,
            context.model_id,
        )
        provider = resolve_llm(fallback_id, user_id=context.nexus_user_id)
        return provider, warning
    return provider, None


async def _run_llm_turn(*, message: Message, context: TelegramTurnContext) -> None:
    """Drive the LLM streaming pipeline for one Telegram turn.

    Extracted from ``_on_message`` to keep that dispatcher closure narrow
    enough to satisfy the project's complexity cap.  Sends a placeholder
    reply, resolves the provider (with the auto-clear safety net),
    builds the channel message, streams the response, and finally fires
    the auto-title pass.

    Args:
        message: The inbound aiogram ``Message`` (used for ``answer``,
            ``chat.id``, ``bot``, and ``message_thread_id``).
        context: Resolved turn context from ``handle_plain_message``.
    """
    user_text = message.text or ""
    if message.bot is None:
        raise RuntimeError("Telegram message has no bot; refusing to stream.")
    thinking_msg = await message.answer("⏳")

    # Resolve the user's default workspace so the agent has filesystem
    # access.  If onboarding hasn't completed (no workspace), we fall
    # back to an empty tool list so the turn still works.
    from app.channels.telegram import make_telegram_sender  # noqa: PLC0415
    from app.core.agent_tools import build_agent_tools  # noqa: PLC0415
    from app.core.tools.agents_md import assemble_workspace_prompt  # noqa: PLC0415
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
    workspace_system_prompt = (
        assemble_workspace_prompt(Path(workspace.path)) if workspace is not None else None
    )

    provider, warning = await _resolve_provider_with_auto_clear(context)
    if warning is not None:
        await message.answer(warning)

    async def _do_stream() -> None:
        await stream_persisted_turn(
            message=message,
            context=context,
            user_text=user_text,
            placeholder_message_id=thinking_msg.message_id,
            provider=provider,
            agent_tools=agent_tools,
            workspace_system_prompt=workspace_system_prompt,
        )

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

    # Auto-title: derive a title from the first user message and
    # rename the Telegram topic thread to match.  Fires once only
    # (gated by title_set_by IS NULL).  Errors are swallowed so a
    # topic-rename failure never breaks the conversation.
    try:
        await _maybe_set_auto_title(
            bot=message.bot,
            conversation_id=context.conversation_id,
            user_text=user_text,
            chat_id=message.chat.id,
            thread_id=context.thread_id,
        )
    except Exception:
        logger.warning("TELEGRAM_AUTO_TITLE_FAILED", exc_info=True)


@dataclass
class TelegramService:
    """Holds the aiogram primitives so the lifespan can stop them cleanly."""

    bot: Bot
    dispatcher: Dispatcher
    polling_task: asyncio.Task[None] | None = None

    async def feed_webhook_update(self, update: Update) -> None:
        """Hand a single ``Update`` parsed from the webhook body to aiogram.

        Used by the FastAPI webhook route in production. Polling does
        not call this — aiogram's polling loop owns its own dispatch.
        """
        await self.dispatcher.feed_update(self.bot, update)


def build_telegram_service() -> TelegramService:
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
        raise RuntimeError("TELEGRAM_BOT_TOKEN must be set to start the Telegram service.")

    bot = Bot(
        token=settings.telegram_bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dispatcher = Dispatcher()

    @dispatcher.message(CommandStart(deep_link=True))
    @dispatcher.message(CommandStart())
    async def _on_start(message: Message) -> None:
        sender = _sender_from_message(message)
        # aiogram exposes the deep-link argument via `command.args` on
        # the parsed CommandObject, but using `message.text` keeps the
        # handler robust if a user manually types `/start ABC123`.
        payload = _extract_start_payload(message.text or "")
        async with async_session_maker() as session:
            reply = await handle_start_command(sender=sender, payload=payload, session=session)
        await message.answer(reply)

    @dispatcher.message(Command("stop"))
    async def _on_stop(message: Message) -> None:
        chat_id = message.chat.id
        task = _running_tasks.pop(chat_id, None)
        was_running = task is not None and not task.done()
        if was_running:
            task.cancel()  # type: ignore[union-attr]
        # handle_stop_command is a plain sync function — no await.
        reply = handle_stop_command(was_running=was_running)
        await message.answer(reply)

    @dispatcher.message(Command("new"))
    async def _on_new(message: Message) -> None:
        sender = _sender_from_message(message)
        async with async_session_maker() as session:
            reply = await handle_new_command(sender=sender, session=session)
        await message.answer(reply)

    @dispatcher.message(Command("model"))
    async def _on_model(message: Message) -> None:
        text = message.text or ""
        # Strip the "/model" prefix (plus optional @botname) and grab the rest.
        parts = text.strip().split(maxsplit=1)
        model_arg = parts[1].strip() if len(parts) > 1 else ""
        sender = _sender_from_message(message)
        async with async_session_maker() as session:
            reply = await handle_model_command(sender=sender, model_arg=model_arg, session=session)
        await message.answer(reply)

    @dispatcher.message()
    async def _on_message(message: Message) -> None:
        if not message.text:
            return
        sender = _sender_from_message(message)
        async with async_session_maker() as session:
            result = await handle_plain_message(sender=sender, text=message.text, session=session)

        if isinstance(result, str):
            # Terminal reply — user isn't bound or some other error.
            await message.answer(result)
            return

        await _run_llm_turn(message=message, context=result)

    return TelegramService(bot=bot, dispatcher=dispatcher)


def _sender_from_message(message: Message) -> TelegramSender:
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


_START_COMMAND_PARTS_WITH_PAYLOAD = 2
"""``"/start <code>"`` splits into exactly two parts; below this means no payload."""


def _extract_start_payload(text: str) -> str | None:
    """Return the argument after ``/start`` (Telegram deep-link payload), if any."""
    parts = text.strip().split(maxsplit=1)
    if len(parts) < _START_COMMAND_PARTS_WITH_PAYLOAD:
        return None
    return parts[1].strip() or None


# ---------------------------------------------------------------------------
# Auto-title helpers (module-level, not inside build_telegram_service)
# ---------------------------------------------------------------------------


def _generate_title(text: str, max_len: int = 48) -> str:
    """Derive a short title from the first user message.

    Strips leading slash-command prefixes (e.g. leftovers from ``/new``),
    truncates to *max_len* characters, appends an ellipsis when truncated,
    and falls back to ``"Telegram"`` for empty input.
    """
    cleaned = text.strip()
    # Strip a leading /command (shouldn't normally reach here, but belt-and-
    # suspenders: the user might type "/new hello" as their first message).
    if cleaned.startswith("/"):
        # Keep everything after the first word (the command itself).
        cleaned = cleaned.split(None, 1)[1] if " " in cleaned else ""
    cleaned = cleaned.strip()
    if not cleaned:
        return "Telegram"
    if len(cleaned) <= max_len:
        return cleaned
    return cleaned[: max_len - 1] + "…"


async def _maybe_set_auto_title(
    *,
    bot: Bot,
    conversation_id: uuid.UUID,
    user_text: str,
    chat_id: int,
    thread_id: int | None,
) -> None:
    """Generate and persist an auto-title for a conversation's first turn.

    Fires once only — gated by ``title_set_by IS NULL``.  On success sets
    ``title_set_by = 'auto'`` so the gate is never tripped again for this
    conversation.  If the conversation lives in a Telegram topic thread,
    also calls ``editForumTopic`` to rename the thread to match, giving
    users a readable label in their Telegram topic list.

    Args:
        bot: Live aiogram ``Bot`` instance.
        conversation_id: UUID of the conversation to maybe-title.
        user_text: The user's first message — used to derive the title.
        chat_id: Telegram chat ID (needed for ``editForumTopic``).
        thread_id: Telegram topic thread ID, or ``None`` for plain DMs.
    """
    async with async_session_maker() as session:
        from app.models import Conversation  # noqa: PLC0415

        conv = await session.get(Conversation, conversation_id)
        if conv is None or conv.title_set_by is not None:
            return  # already titled — nothing to do

        title = _generate_title(user_text)
        conv.title = title
        conv.title_set_by = "auto"
        await session.commit()

    logger.info(
        "TELEGRAM_AUTO_TITLE conversation_id=%s title=%r thread_id=%s",
        conversation_id,
        title,
        thread_id,
    )

    # Rename the Telegram topic thread so the user sees the derived title
    # in their Topics list.  Only possible when the chat has topics enabled
    # and the bot has the necessary admin rights — errors are logged as
    # warnings and swallowed so the feature degrades gracefully.
    if thread_id is not None:
        try:
            await bot.edit_forum_topic(
                chat_id=chat_id,
                message_thread_id=thread_id,
                name=title,
            )
        except Exception as exc:
            logger.warning(
                "TELEGRAM_EDIT_TOPIC_FAILED chat_id=%s thread_id=%s error=%s",
                chat_id,
                thread_id,
                exc,
            )


@asynccontextmanager
async def telegram_lifespan() -> AsyncIterator[TelegramService | None]:
    """Lifespan-friendly context manager that boots + tears down the bot.

    Yields ``None`` when Telegram is intentionally disabled (no bot
    token) so callers can ``async with`` unconditionally without the
    callsite branching on configuration. Yields a live ``TelegramService``
    otherwise — and ensures the polling task or webhook registration is
    properly cleaned up on shutdown.
    """
    if settings.demo_mode:
        logger.info("TELEGRAM_DISABLED reason=demo_mode")
        yield None
        return
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
            raise RuntimeError("TELEGRAM_MODE=webhook requires TELEGRAM_WEBHOOK_URL to be set.")
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
            # The task either finishes cleanly (CancelledError) or surfaces
            # an unrelated shutdown error.  We swallow both because the
            # lifespan is already tearing down; there is nothing to recover.
            with contextlib.suppress(asyncio.CancelledError, Exception):
                await service.polling_task
        try:
            await service.bot.session.close()
        except Exception:
            logger.warning("TELEGRAM_SHUTDOWN session_close_failed", exc_info=True)
