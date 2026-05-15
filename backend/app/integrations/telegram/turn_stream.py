"""Persistence-aware Telegram LLM turn streaming helpers."""

from __future__ import annotations

import asyncio
import logging
import uuid
from collections.abc import AsyncIterator
from pathlib import Path
from typing import TYPE_CHECKING, Any

from app.channels import ChannelMessage, resolve_channel
from app.channels.telegram import SURFACE_TELEGRAM
from app.core.agent_loop.types import PermissionCheckResult
from app.core.chat_aggregator import ChatTurnAggregator
from app.core.governance.permissions import (
    PermissionContext,
    build_default_permission_check,
)
from app.core.governance.workspace_context import load_workspace_context
from app.core.providers.base import AILLM, StreamEvent
from app.crud.chat_message import (
    append_assistant_placeholder,
    append_user_message,
    finalize_assistant_message,
    get_messages_for_conversation,
)
from app.db import async_session_maker

if TYPE_CHECKING:
    from aiogram.types import Message

    from app.core.agent_loop.types import AgentTool
    from app.integrations.telegram.handlers import TelegramTurnContext

logger = logging.getLogger(__name__)


async def stream_persisted_turn(
    *,
    message: Message,
    context: TelegramTurnContext,
    user_text: str,
    placeholder_message_id: int,
    provider: AILLM,
    agent_tools: list[AgentTool],
    workspace_system_prompt: str | None,
    workspace_root: Path | None = None,
) -> None:
    """Stream a Telegram turn while persisting user and assistant messages.

    ``workspace_root`` is needed to build the per-request
    :class:`PermissionContext` for the cross-provider permission gate
    (PR 03b).  It's optional because the gate is a no-op when no
    workspace is supplied — the callers that *do* have a workspace
    (the bot's standard plain-message handler) pass it through; the
    fallback "no workspace yet" path keeps working unchanged.
    """
    history, assistant_message_id = await _persist_turn_start(
        conversation_id=context.conversation_id,
        user_id=context.nexus_user_id,
        user_text=user_text,
    )
    channel_message = _build_channel_message(
        message=message,
        context=context,
        user_text=user_text,
        placeholder_message_id=placeholder_message_id,
    )
    await _deliver_and_persist_stream(
        provider=provider,
        channel_message=channel_message,
        context=context,
        user_text=user_text,
        history=history,
        agent_tools=agent_tools,
        workspace_system_prompt=workspace_system_prompt,
        assistant_message_id=assistant_message_id,
        workspace_root=workspace_root,
    )


async def _persist_turn_start(
    *,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    user_text: str,
) -> tuple[list[dict[str, str]], uuid.UUID]:
    """Persist the user turn and assistant placeholder, returning prior history."""
    async with async_session_maker() as session:
        recent_rows = await get_messages_for_conversation(
            session,
            conversation_id,
            limit=20,
        )
        history = [
            {"role": row.role, "content": row.content or ""}
            for row in recent_rows
            if row.role in {"user", "assistant"}
        ]
        await append_user_message(
            session,
            conversation_id=conversation_id,
            user_id=user_id,
            content=user_text,
        )
        assistant_row = await append_assistant_placeholder(
            session,
            conversation_id=conversation_id,
            user_id=user_id,
        )
        await session.commit()
        return history, assistant_row.id


def _build_channel_message(
    *,
    message: Message,
    context: TelegramTurnContext,
    user_text: str,
    placeholder_message_id: int,
) -> ChannelMessage:
    """Build Telegram channel delivery metadata for a streaming turn."""
    return {
        "user_id": context.nexus_user_id,
        "conversation_id": context.conversation_id,
        "text": user_text,
        "surface": SURFACE_TELEGRAM,
        "model_id": context.model_id,
        "metadata": {
            "bot": message.bot,
            "chat_id": message.chat.id,
            "message_id": placeholder_message_id,
        },
    }


async def _deliver_and_persist_stream(
    *,
    provider: AILLM,
    channel_message: ChannelMessage,
    context: TelegramTurnContext,
    user_text: str,
    history: list[dict[str, str]],
    agent_tools: list[AgentTool],
    workspace_system_prompt: str | None,
    assistant_message_id: uuid.UUID,
    workspace_root: Path | None = None,
) -> None:
    """Stream a Telegram response and persist the assistant row on completion."""
    channel = resolve_channel(SURFACE_TELEGRAM)
    aggregator = ChatTurnAggregator()
    final_status = "complete"
    permission_check = _build_permission_check(context, workspace_root)

    async def _guarded_stream() -> AsyncIterator[StreamEvent]:
        try:
            async for event in provider.stream(
                user_text,
                context.conversation_id,
                context.nexus_user_id,
                history=history,
                tools=agent_tools or None,
                system_prompt=workspace_system_prompt,
                permission_check=permission_check,
            ):
                aggregator.apply(event)
                yield event
        except Exception as exc:
            logger.exception(
                "TELEGRAM_STREAM_ERR conversation_id=%s",
                context.conversation_id,
            )
            err_event: StreamEvent = {"type": "error", "content": str(exc)}
            aggregator.apply(err_event)
            yield err_event

    try:
        async for _ in channel.deliver(_guarded_stream(), channel_message):
            pass  # delivery is a side-effect; nothing yielded by TelegramChannel
    except asyncio.CancelledError:
        final_status = "failed"
        raise
    finally:
        await _finalize_persisted_assistant_message(
            conversation_id=context.conversation_id,
            message_id=assistant_message_id,
            aggregator=aggregator,
            status=final_status,
        )


def _build_permission_check(
    context: TelegramTurnContext,
    workspace_root: Path | None,
):
    """Return a permission gate bound to this turn's user / workspace.

    The Telegram path mirrors the chat router's wire-up: a per-request
    :class:`PermissionContext` is fed into
    :func:`build_default_permission_check` and adapted to the
    cross-provider ``(tool_name, arguments)`` signature so the loop's
    permission seam never sees Telegram-specific state.

    Returns ``None`` when no workspace was supplied — the gate has
    nothing to anchor file / bash boundary checks against, so it stays
    a no-op rather than denying every tool call.
    """
    if workspace_root is None:
        return None
    workspace_ctx = load_workspace_context(workspace_root)
    permission_context = PermissionContext(
        user_id=str(context.nexus_user_id),
        workspace_root=workspace_root,
        conversation_id=str(context.conversation_id),
        surface=SURFACE_TELEGRAM,
        enabled_tools=workspace_ctx.enabled_tools,
    )
    gate = build_default_permission_check()

    async def _permission_check(tool_name: str, arguments: dict[str, Any]) -> PermissionCheckResult:
        decision = await gate(tool_name, arguments, permission_context)
        return PermissionCheckResult(
            allow=decision.allow,
            reason=decision.reason,
            violation_type=decision.violation_type,
        )

    return _permission_check


async def _finalize_persisted_assistant_message(
    *,
    conversation_id: uuid.UUID,
    message_id: uuid.UUID,
    aggregator: ChatTurnAggregator,
    status: str,
) -> None:
    """Patch the persisted assistant placeholder with the final stream state."""
    final_status = "failed" if aggregator.error_text else status
    snapshot = aggregator.to_persisted_shape(status=final_status)
    try:
        async with async_session_maker() as session:
            await finalize_assistant_message(
                session,
                message_id=message_id,
                **snapshot,
            )
            await session.commit()
    except Exception:
        logger.exception(
            "TELEGRAM_PERSIST_ERR conversation_id=%s message_id=%s",
            conversation_id,
            message_id,
        )
