"""Chat API — channel-routed, provider-agnostic streaming endpoint.

The route stays thin on purpose: it parses the request, hands the
per-turn setup to :func:`app.api._chat_setup.prepare_chat_turn`, opens
the provider stream, and pipes events through the surface's
:class:`Channel` adapter.  Every other concern — model resolution,
workspace prompt assembly, tool composition, prompt-cache telemetry —
lives in the setup helper so this file stays under sentrux's
``no_god_files`` fan-out budget.
"""

from __future__ import annotations

import logging
import time
from collections.abc import AsyncGenerator

from fastapi import Depends, Header
from fastapi.responses import StreamingResponse
from fastapi.routing import APIRouter
from sqlalchemy.ext.asyncio import AsyncSession

from app.api._chat_setup import ChatTurnContext, prepare_chat_turn
from app.channels import resolve_channel, surface_from_header
from app.core.chat_aggregator import ChatTurnAggregator
from app.core.providers import resolve_llm
from app.core.providers.base import StreamEvent
from app.core.request_logging import get_request_id
from app.crud.chat_message import finalize_assistant_message
from app.db import User, async_session_maker, get_async_session
from app.schemas import ChatRequest
from app.users import current_active_user

logger = logging.getLogger(__name__)


def get_chat_router() -> APIRouter:
    """Build the chat ``APIRouter`` mounted at ``/api/v1/chat``.

    Returns:
        An ``APIRouter`` exposing a single streaming ``POST /`` endpoint
        that emits Server-Sent Events from the resolved AI provider.
    """
    router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

    @router.post("/")
    async def chat(
        request: ChatRequest,
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
        x_nexus_surface: str | None = Header(default=None),
    ) -> StreamingResponse:
        """Stream an AI response as Server-Sent Events.

        SSE event shapes:
          {"type": "delta", "content": "..."}      — text chunk
          {"type": "thinking", "content": "..."}   — reasoning (when available)
          {"type": "tool_use", "name": "...", "input": {...}}
          {"type": "tool_result", "content": "..."}
          {"type": "error", "content": "..."}      — stream-level error
          [DONE]

        While streaming, the endpoint also persists the turn to the
        ``chat_messages`` table — the user prompt as a row, the assistant
        reply as a placeholder that is patched on stream end with the full
        chain-of-thought state.  This is what powers
        ``GET /conversations/:id/messages`` rehydration: the chat UI reads
        from ``chat_messages``, not from any provider's internal log.

        The provider is resolved from model_id — the endpoint is fully
        provider-agnostic.  Changing model_id changes the provider; the
        stream format never changes.
        """
        surface = surface_from_header(x_nexus_surface)
        channel = resolve_channel(surface)
        rid = get_request_id()

        # Entry log — pairs with REQ_IN/REQ_OUT from the request middleware via rid.
        # Question length, not contents, to avoid leaking PII into the log file.
        logger.info(
            "CHAT_IN  rid=%s user_id=%s conversation_id=%s model_id=%s surface=%s question_len=%d",
            rid,
            user.id,
            request.conversation_id,
            request.model_id or "<default>",
            surface,
            len(request.question),
        )

        ctx = await prepare_chat_turn(request, session=session, user_id=user.id, rid=rid)
        # Commit before streaming starts — the request session is closed when
        # the StreamingResponse generator runs in a fresh task, so we open a
        # short-lived session inside the generator for the final UPDATE.
        await session.commit()

        provider = resolve_llm(ctx.model_id)

        return StreamingResponse(
            _build_event_stream(
                provider=provider,
                channel=channel,
                surface=surface,
                request=request,
                user_id=user.id,
                rid=rid,
                ctx=ctx,
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )

    return router


def _build_event_stream(
    *,
    provider,
    channel,
    surface: str,
    request: ChatRequest,
    user_id,
    rid: str | None,
    ctx: ChatTurnContext,
) -> AsyncGenerator[bytes]:
    """Return the channel-encoded byte stream for one chat turn.

    Factored out so :func:`get_chat_router.chat` reads as orchestration
    only — open provider, hand to channel, finalise on close — and the
    fan-out of the route file stays under sentrux's god-file budget.
    """

    async def event_stream() -> AsyncGenerator[bytes]:
        stream_start = time.perf_counter()
        event_count = 0
        aggregator = ChatTurnAggregator()

        async def guarded_stream():
            nonlocal event_count
            try:
                async for event in provider.stream(
                    request.question,
                    request.conversation_id,
                    user_id,
                    history=ctx.history,
                    tools=ctx.agent_tools or None,
                    system_prompt=ctx.system_prompt,
                    reasoning_effort=ctx.reasoning_effort,
                ):
                    event_count += 1
                    aggregator.apply(event)
                    yield event
            except Exception as exc:
                logger.exception(
                    "CHAT_ERR rid=%s conversation_id=%s model_id=%s after %d events",
                    rid,
                    request.conversation_id,
                    ctx.model_id,
                    event_count,
                )
                error_event: StreamEvent = {"type": "error", "content": str(exc)}
                aggregator.apply(error_event)
                yield error_event

        from app.channels.base import ChannelMessage  # noqa: PLC0415

        channel_message: ChannelMessage = {
            "user_id": user_id,
            "conversation_id": request.conversation_id,
            "text": request.question,
            "surface": surface,
            "model_id": ctx.model_id,
            "metadata": {},
        }

        try:
            async for chunk in channel.deliver(guarded_stream(), channel_message):
                yield chunk
        finally:
            await _finalise_turn(
                aggregator=aggregator,
                assistant_message_id=ctx.assistant_message_id,
                rid=rid,
                conversation_id=request.conversation_id,
                model_id=ctx.model_id,
                surface=surface,
                event_count=event_count,
                started_at=stream_start,
            )

    return event_stream()


async def _finalise_turn(
    *,
    aggregator: ChatTurnAggregator,
    assistant_message_id,
    rid: str | None,
    conversation_id,
    model_id: str,
    surface: str,
    event_count: int,
    started_at: float,
) -> None:
    """Persist the aggregator snapshot and emit the CHAT_OUT log line.

    Runs in the ``finally`` of the stream loop so the assistant
    placeholder row gets its final UPDATE on both successful completion
    and mid-stream errors.  The DB write happens on its own short-lived
    session because the request-scoped session is closed by the time
    the streaming generator finalises.
    """
    duration_ms = (time.perf_counter() - started_at) * 1000
    final_status = "failed" if aggregator.error_text else "complete"
    snapshot = aggregator.to_persisted_shape(status=final_status)
    try:
        async with async_session_maker() as persist_session:
            await finalize_assistant_message(
                persist_session,
                message_id=assistant_message_id,
                **snapshot,
            )
            await persist_session.commit()
    except Exception:
        logger.exception(
            "CHAT_PERSIST_ERR rid=%s message_id=%s",
            rid,
            assistant_message_id,
        )
    logger.info(
        "CHAT_OUT rid=%s conversation_id=%s model_id=%s surface=%s events=%d duration_ms=%.1f",
        rid,
        conversation_id,
        model_id,
        surface,
        event_count,
        duration_ms,
    )
