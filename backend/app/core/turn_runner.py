"""Shared LLM turn pipeline for chat surfaces."""

from __future__ import annotations

import logging
import time
import uuid
from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING, Any

from app.core.chat_aggregator import ChatTurnAggregator
from app.core.tools.agents_md import assemble_workspace_prompt
from app.crud.chat_message import (
    append_assistant_placeholder,
    append_user_message,
    finalize_assistant_message,
    get_messages_for_conversation,
)
from app.db import async_session_maker

if TYPE_CHECKING:
    from app.channels.base import Channel, ChannelMessage
    from app.core.agent_loop.types import AgentTool
    from app.core.providers.base import AILLM, ReasoningEffort, StreamEvent

logger = logging.getLogger(__name__)

EventHook = Callable[["StreamEvent"], list["StreamEvent"]]


@dataclass(frozen=True)
class ChatTurnInput:
    """Resolved inputs for one persisted user/assistant turn."""

    conversation_id: uuid.UUID
    user_id: uuid.UUID
    question: str
    provider: AILLM
    channel: Channel
    channel_message: ChannelMessage
    workspace_root: Path | None = None
    tools: list[AgentTool] | None = None
    reasoning_effort: ReasoningEffort | None = None
    history_window: int = 20
    log_tag: str = "TURN"
    log_extras: dict[str, Any] = field(default_factory=dict)


@dataclass
class _EventCounter:
    """Mutable counter shared with the nested provider-stream wrapper."""

    value: int = 0


async def run_turn(
    turn_input: ChatTurnInput,
    *,
    event_hooks: list[EventHook] | None = None,
) -> AsyncIterator[bytes]:
    """Persist, stream, deliver, and finalize one chat turn."""
    started_at = time.perf_counter()
    history, assistant_message_id = await _load_history_and_persist(turn_input)
    system_prompt = _workspace_system_prompt(turn_input.workspace_root)
    aggregator = ChatTurnAggregator()
    hooks = list(event_hooks or [])
    counter = _EventCounter()

    async def guarded_stream() -> AsyncIterator[StreamEvent]:
        try:
            async for event in turn_input.provider.stream(
                turn_input.question,
                turn_input.conversation_id,
                turn_input.user_id,
                history=history,
                tools=turn_input.tools or None,
                system_prompt=system_prompt,
                reasoning_effort=turn_input.reasoning_effort,
            ):
                counter.value += 1
                aggregator.apply(event)
                yield event
                for hook in hooks:
                    for extra in hook(event):
                        counter.value += 1
                        aggregator.apply(extra)
                        yield extra
        except Exception as exc:
            logger.exception(
                "%s_STREAM_ERR conversation_id=%s after %d events",
                turn_input.log_tag,
                turn_input.conversation_id,
                counter.value,
            )
            error_event: StreamEvent = {"type": "error", "content": str(exc)}
            aggregator.apply(error_event)
            yield error_event

    try:
        async for chunk in turn_input.channel.deliver(
            guarded_stream(),
            turn_input.channel_message,
        ):
            yield chunk
    finally:
        await _finalize_turn(
            turn_input=turn_input,
            aggregator=aggregator,
            assistant_message_id=assistant_message_id,
            started_at=started_at,
            event_count=counter.value,
        )


async def _load_history_and_persist(
    turn_input: ChatTurnInput,
) -> tuple[list[dict[str, str]], uuid.UUID]:
    """Read recent history, then persist the current user turn and placeholder."""
    async with async_session_maker() as session:
        recent_rows = await get_messages_for_conversation(
            session,
            turn_input.conversation_id,
            limit=turn_input.history_window,
        )
        history = [
            {"role": row.role, "content": row.content or ""}
            for row in recent_rows
            if row.role in {"user", "assistant"}
        ]
        await append_user_message(
            session,
            conversation_id=turn_input.conversation_id,
            user_id=turn_input.user_id,
            content=turn_input.question,
        )
        assistant_row = await append_assistant_placeholder(
            session,
            conversation_id=turn_input.conversation_id,
            user_id=turn_input.user_id,
        )
        await session.commit()
        return history, assistant_row.id


def _workspace_system_prompt(workspace_root: Path | None) -> str | None:
    """Load workspace prompt files when a workspace root is available."""
    if workspace_root is None:
        return None
    return assemble_workspace_prompt(workspace_root)


async def _finalize_turn(
    *,
    turn_input: ChatTurnInput,
    aggregator: ChatTurnAggregator,
    assistant_message_id: uuid.UUID,
    started_at: float,
    event_count: int,
) -> None:
    """Patch the assistant placeholder with the final aggregated stream state."""
    duration_ms = (time.perf_counter() - started_at) * 1000
    final_status = "failed" if aggregator.error_text else "complete"
    snapshot = aggregator.to_persisted_shape(status=final_status)
    try:
        async with async_session_maker() as session:
            await finalize_assistant_message(
                session,
                message_id=assistant_message_id,
                **snapshot,
            )
            await session.commit()
    except Exception:
        logger.exception(
            "%s_PERSIST_ERR conversation_id=%s message_id=%s",
            turn_input.log_tag,
            turn_input.conversation_id,
            assistant_message_id,
        )

    extras = " ".join(f"{key}={value}" for key, value in turn_input.log_extras.items())
    logger.info(
        "%s_OUT conversation_id=%s events=%d duration_ms=%.1f %s",
        turn_input.log_tag,
        turn_input.conversation_id,
        event_count,
        duration_ms,
        extras,
    )
