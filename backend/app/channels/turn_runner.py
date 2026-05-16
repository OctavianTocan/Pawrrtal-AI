"""Shared LLM turn pipeline for chat surfaces."""

from __future__ import annotations

import logging
import time
import uuid
from collections import Counter
from collections.abc import AsyncIterator, Callable, Iterator
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING, Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.chat_aggregator import ChatTurnAggregator, should_emit_event
from app.core.config import settings
from app.core.event_bus import TurnCompletedEvent
from app.core.event_bus.global_bus import publish_if_available
from app.core.governance.cost_tracker import (
    PostgresCostLedger,
    record_turn_cost,
)
from app.core.governance.workspace_context import load_workspace_context
from app.core.providers.model_id import parse_model_id
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
    from app.core.agent_loop.types import AgentTool, PermissionCheckFn
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
    db_session: AsyncSession | None = field(default=None, repr=False, compare=False)
    workspace_root: Path | None = None
    tools: list[AgentTool] | None = None
    reasoning_effort: ReasoningEffort | None = None
    # PR 03b — cross-provider can_use_tool gate. None preserves the
    # historical behaviour (no permission check); when supplied, the
    # provider plumbs it into AgentLoopConfig (Gemini) or
    # ClaudeAgentOptions.can_use_tool (Claude) so the same policy
    # applies regardless of model.
    permission_check: PermissionCheckFn | None = None
    # PR 09 — multimodal image inputs forwarded to the provider.  Each
    # entry is ``{"data": <base64>, "media_type": "image/<mime>"}`` —
    # the same wire shape ``ChatRequest.images`` carries on the API
    # boundary.  ``None`` (the default) is the legacy text-only path.
    images: list[dict[str, str]] | None = None
    history_window: int = 20
    log_tag: str = "TURN"
    log_extras: dict[str, Any] = field(default_factory=dict)
    verbose_level: int | None = None


@dataclass
class _EventCounter:
    """Mutable counter shared with the nested provider-stream wrapper.

    ``value`` is the total event count (kept for backwards-compatible logs).
    ``by_type`` is the per-event-type breakdown so the postmortem log line
    can answer "what kinds of 51 events did this turn produce?" — invaluable
    when debugging stuck Telegram placeholders or runaway tool loops.
    """

    value: int = 0
    by_type: Counter[str] = field(default_factory=Counter)

    def record(self, event: StreamEvent) -> None:
        """Increment both the total and the per-type bucket for *event*."""
        self.value += 1
        self.by_type[event.get("type", "unknown")] += 1


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
                permission_check=turn_input.permission_check,
                images=turn_input.images,
            ):
                if not _should_deliver_event(event, turn_input.verbose_level):
                    continue
                counter.record(event)
                aggregator.apply(event)
                yield event
                for extra in _expand_hook_events(event, hooks):
                    counter.record(extra)
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
            counter.record(error_event)
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
            event_breakdown=counter.by_type,
        )


def _expand_hook_events(
    event: StreamEvent,
    hooks: list[EventHook],
) -> Iterator[StreamEvent]:
    """Yield extra events produced by each hook for the upstream event."""
    for hook in hooks:
        yield from hook(event)


def _should_deliver_event(event: StreamEvent, verbose_level: int | None) -> bool:
    """Apply per-channel verbosity filtering when a channel requests it."""
    if verbose_level is None:
        return True
    return should_emit_event(event, verbose_level)


async def _load_history_and_persist(
    turn_input: ChatTurnInput,
) -> tuple[list[dict[str, str]], uuid.UUID]:
    """Read recent history, then persist the current user turn and placeholder."""
    async with _turn_session(turn_input) as session:
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


@asynccontextmanager
async def _turn_session(turn_input: ChatTurnInput) -> AsyncIterator[AsyncSession]:
    """Yield the request session when provided, otherwise open a runner session."""
    if turn_input.db_session is not None:
        yield turn_input.db_session
        return
    async with async_session_maker() as session:
        yield session


def _workspace_system_prompt(workspace_root: Path | None) -> str | None:
    """Load workspace prompt files when a workspace root is available.

    PR 06 — uses :func:`load_workspace_context` so SOUL.md / AGENTS.md /
    CLAUDE.md and ``.claude/skills/`` are merged into one provider-
    neutral system prompt. Falls back to the legacy
    :func:`assemble_workspace_prompt` builder when WorkspaceContext is
    disabled or returns nothing so existing deployments don't lose
    their AGENTS.md content.
    """
    if workspace_root is None:
        return None
    workspace_ctx = load_workspace_context(workspace_root)
    if workspace_ctx.system_prompt is not None:
        return workspace_ctx.system_prompt
    return assemble_workspace_prompt(workspace_root)


async def _finalize_turn(
    *,
    turn_input: ChatTurnInput,
    aggregator: ChatTurnAggregator,
    assistant_message_id: uuid.UUID,
    started_at: float,
    event_count: int,
    event_breakdown: Counter[str],
) -> None:
    """Patch the assistant placeholder with the final aggregated stream state."""
    duration_ms = (time.perf_counter() - started_at) * 1000
    final_status = "failed" if aggregator.error_text else "complete"
    snapshot = aggregator.to_persisted_shape(status=final_status)
    try:
        async with _turn_session(turn_input) as session:
            await finalize_assistant_message(
                session,
                message_id=assistant_message_id,
                **snapshot,
            )
            # Cost ledger write (PR 04). Same session as the message
            # persist so a failed commit leaves no orphaned ledger row.
            # Runs for every surface (web + Telegram) so the per-user
            # cap applies uniformly.
            await _record_turn_cost(
                session=session,
                turn_input=turn_input,
                aggregator=aggregator,
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
    breakdown = (
        " ".join(f"{name}={count}" for name, count in sorted(event_breakdown.items())) or "none"
    )
    logger.info(
        "%s_OUT conversation_id=%s events=%d duration_ms=%.1f breakdown=[%s] %s",
        turn_input.log_tag,
        turn_input.conversation_id,
        event_count,
        duration_ms,
        breakdown,
        extras,
    )
    # PR 10: announce completion (success / failure both surface here
    # because the caller wraps run_turn in a try/finally).  Subscribers
    # can react to spend, latency, etc.
    surface = (
        (turn_input.channel_message.get("surface") or "") if turn_input.channel_message else ""
    )
    model_id = (
        (turn_input.channel_message.get("model_id") or "") if turn_input.channel_message else ""
    )
    await publish_if_available(
        TurnCompletedEvent(
            user_id=turn_input.user_id,
            conversation_id=turn_input.conversation_id,
            surface=surface,
            model_id=model_id,
            status=final_status,
            duration_ms=duration_ms,
            cost_usd=aggregator.total_cost_usd,
            source=turn_input.log_tag.lower(),
        )
    )


async def _record_turn_cost(
    *,
    session: AsyncSession,
    turn_input: ChatTurnInput,
    aggregator: ChatTurnAggregator,
) -> None:
    """Append the turn's spend to ``cost_ledger`` (PR 04).

    No-op when cost tracking is disabled or the aggregator saw zero
    usage events (early failures, errors before the terminal turn).
    Catches and logs DB errors so a ledger write failure never leaves
    the assistant row unpersisted — the caller commits in the same
    transaction.
    """
    if not settings.cost_tracker_enabled:
        return
    if (
        aggregator.total_input_tokens <= 0
        and aggregator.total_output_tokens <= 0
        and aggregator.total_cost_usd <= 0
    ):
        return
    model_id = (
        (turn_input.channel_message.get("model_id") or "") if turn_input.channel_message else ""
    )
    surface = (
        (turn_input.channel_message.get("surface") or "") if turn_input.channel_message else ""
    )
    try:
        provider_slug = parse_model_id(model_id).host.value if model_id else "unknown"
    except Exception:
        provider_slug = "unknown"
    ledger = PostgresCostLedger(session=session)
    try:
        await record_turn_cost(
            ledger,
            user_id=turn_input.user_id,
            conversation_id=turn_input.conversation_id,
            provider=provider_slug,
            model_id=model_id,
            input_tokens=aggregator.total_input_tokens,
            output_tokens=aggregator.total_output_tokens,
            cost_usd=aggregator.total_cost_usd,
            surface=surface,
        )
    except Exception:
        logger.exception(
            "%s_COST_LEDGER_ERR conversation_id=%s",
            turn_input.log_tag,
            turn_input.conversation_id,
        )
