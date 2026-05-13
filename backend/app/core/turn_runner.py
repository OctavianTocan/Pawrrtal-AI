"""Shared LLM-turn pipeline for every chat surface.

@fileoverview The chat API endpoint (web/Electron SSE) and the Telegram
bot both run the *same* sequence for every assistant turn:

  1. Open a short-lived DB session, load the recent message window.
  2. Persist the user message + an assistant placeholder row, commit
     before streaming starts so a mid-stream disconnect still leaves a
     partial record.
  3. Stream provider events into a :class:`ChatTurnAggregator` so the
     persisted shape mirrors what the live UI sees.
  4. Pipe the (aggregating, error-guarded) event stream through the
     surface's ``Channel.deliver()`` adapter.
  5. In a ``finally`` block, write the aggregator snapshot back to the
     assistant_message row in a fresh session.

Before this module existed the pipeline was duplicated between
``app.api.chat`` and ``app.integrations.telegram.bot``, with nested
``async def`` closures and per-call inline imports.  The duplication was
hostile to review *and* a real bug surface (any divergence between the
two copies = silently different behaviour between web and Telegram).

Surface-specific side effects (e.g. lifting the ``render_artifact`` spec
into a sibling ``artifact`` event, draining a per-request ``send_message``
queue) plug in via the ``event_hooks`` parameter — small, synchronous
functions that take a provider event and return zero or more extra
events to splice into the stream.
"""

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
    from app.core.providers.base import Provider, StreamEvent

logger = logging.getLogger(__name__)

# Sync hook: takes one provider event, returns zero-or-more extra events
# to splice into the outbound stream (after the original event has been
# aggregated + yielded).  Sync because every current use-site is sync —
# wrap an async producer behind a queue if you need async work.
EventHook = Callable[["StreamEvent"], list["StreamEvent"]]


# TODO: Calling this "TurnPlan" is a really bad idea. It makes it very confusing as to what exactly this is. Especially because we have a "Plan Mode".
@dataclass
class TurnPlan:
    """Everything a single chat turn needs to run.

    A turn = "user sent a message → agent replied", persisted to the
    ``chat_messages`` table and delivered through the surface channel.

    Attributes:
        conversation_id: Conversation the turn belongs to.
        user_id: Owner of the conversation.
        question: User message text.
        provider: Resolved LLM provider (already model-aware).
        channel: Surface channel (web SSE, Telegram, …).
        channel_message: Channel-shaped message envelope.
        workspace_root: Filesystem root for the workspace AGENTS.md +
            SOUL.md system prompt.  ``None`` skips the prompt entirely.
        tools: Provider-shaped tool list, or ``None`` for plain chat.
        history_window: How many recent messages to feed back as context.
        log_tag: Prefix for log lines (e.g. ``CHAT`` or ``TELEGRAM``).
        log_extras: Extra key=value pairs appended to the OUT log line.
    """

    conversation_id: uuid.UUID
    user_id: int
    question: str
    provider: Provider
    channel: Channel
    channel_message: ChannelMessage
    workspace_root: Path | None = None
    tools: list[Any] | None = None
    history_window: int = 20
    log_tag: str = "TURN"
    log_extras: dict[str, Any] = field(default_factory=dict)


async def run_turn(
    plan: TurnPlan,
    *,
    event_hooks: list[EventHook] | None = None,
) -> AsyncIterator[bytes]:
    r"""Run a full LLM turn end-to-end.

    Yields whatever ``plan.channel.deliver()`` yields — surface-specific
    bytes for web SSE, nothing useful for Telegram (where the channel
    treats delivery as a side-effect and yields ``None``).

    Args:
        plan: Resolved turn inputs (see :class:`TurnPlan`).
        event_hooks: Optional list of synchronous hooks called per
            provider event in order.  Each hook returns zero or more
            extra :class:`StreamEvent`\s to splice into the outbound
            stream; spliced events are also fed through the aggregator
            so they land in the persisted snapshot.
    """
    started_at = time.perf_counter()
    history, assistant_message_id = await _load_history_and_persist(plan)
    system_prompt = (
        assemble_workspace_prompt(plan.workspace_root) if plan.workspace_root is not None else None
    )

    aggregator = ChatTurnAggregator()
    hooks: list[EventHook] = list(event_hooks or [])
    counter = _EventCounter()

    async def _guarded_stream() -> AsyncIterator[StreamEvent]:
        """Wrap the provider stream with error capture + aggregation + hooks."""
        try:
            async for event in plan.provider.stream(
                plan.question,
                plan.conversation_id,
                plan.user_id,
                history=history,
                tools=plan.tools or None,
                system_prompt=system_prompt,
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
                plan.log_tag,
                plan.conversation_id,
                counter.value,
            )
            err_event: StreamEvent = {"type": "error", "content": str(exc)}
            aggregator.apply(err_event)
            yield err_event

    try:
        async for chunk in plan.channel.deliver(_guarded_stream(), plan.channel_message):
            yield chunk
    finally:
        await _finalize_turn(
            plan=plan,
            aggregator=aggregator,
            assistant_message_id=assistant_message_id,
            started_at=started_at,
            event_count=counter.value,
        )


# ── Internal helpers ────────────────────────────────────────────────────────


@dataclass
class _EventCounter:
    """Tiny mutable wrapper so ``_guarded_stream`` and ``run_turn`` share state.

    Plain ``int`` rebinding inside a closure breaks the outer scope; using
    a wrapper avoids ``nonlocal`` gymnastics across the two functions.
    """

    value: int = 0


async def _load_history_and_persist(
    plan: TurnPlan,
) -> tuple[list[dict[str, str]], uuid.UUID]:
    """Read recent history, persist user msg + assistant placeholder.

    Done in a *single* short-lived session so all three statements are
    one transaction.  The returned ``assistant_message_id`` is the row
    we'll patch on stream end with the full aggregated snapshot.
    """
    async with async_session_maker() as session:
        recent_rows = await get_messages_for_conversation(
            session, plan.conversation_id, limit=plan.history_window
        )
        history = [
            {"role": row.role, "content": row.content or ""}
            for row in recent_rows
            if row.role in {"user", "assistant"}
        ]
        await append_user_message(
            session,
            conversation_id=plan.conversation_id,
            user_id=plan.user_id,
            content=plan.question,
        )
        assistant_row = await append_assistant_placeholder(
            session,
            conversation_id=plan.conversation_id,
            user_id=plan.user_id,
        )
        await session.commit()
        return history, assistant_row.id


async def _finalize_turn(
    *,
    plan: TurnPlan,
    aggregator: ChatTurnAggregator,
    assistant_message_id: uuid.UUID,
    started_at: float,
    event_count: int,
) -> None:
    """Patch the placeholder row with the final aggregated snapshot.

    Runs unconditionally in the caller's ``finally`` block.  A failure
    here is logged but never re-raised — the caller's stream has already
    drained, so there's nobody upstream to receive the error.
    """
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
            plan.log_tag,
            plan.conversation_id,
            assistant_message_id,
        )

    extras = " ".join(f"{k}={v}" for k, v in plan.log_extras.items())
    logger.info(
        "%s_OUT conversation_id=%s events=%d duration_ms=%.1f %s",
        plan.log_tag,
        plan.conversation_id,
        event_count,
        duration_ms,
        extras,
    )
