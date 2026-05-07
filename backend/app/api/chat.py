"""Chat API — channel-routed, provider-agnostic streaming endpoint."""

from __future__ import annotations

import logging
import time
from collections.abc import AsyncGenerator

from fastapi import Depends, Header, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.routing import APIRouter
from sqlalchemy.ext.asyncio import AsyncSession

from pathlib import Path

from app.channels import resolve_channel, surface_from_header
from app.core.chat_aggregator import ChatTurnAggregator
from app.core.providers import resolve_llm
from app.core.providers.base import StreamEvent
from app.core.tools.workspace_files import make_workspace_tools
from app.core.workspace import get_default_workspace
from app.core.request_logging import get_request_id
from app.crud.chat_message import (
    append_assistant_placeholder,
    append_user_message,
    finalize_assistant_message,
    get_messages_for_conversation,
)
from app.crud.conversation import (
    get_conversation_service,
    update_conversation_model_service,
)
from app.db import User, async_session_maker, get_async_session
from app.schemas import ChatRequest
from app.users import current_active_user

logger = logging.getLogger(__name__)

# How many recent messages to send as context to the provider.
# Keeps token usage predictable while preserving recent turns.
_HISTORY_WINDOW = 20

_DEFAULT_MODEL = "gemini-3-flash-preview"


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
        chain-of-thought state. This is what powers ``GET /conversations/:id/messages``
        rehydration: the chat UI reads from ``chat_messages``, not from
        Agno's internal log.

        The provider is resolved from model_id — the endpoint is fully
        provider-agnostic. Changing model_id changes the provider; the
        stream format never changes.
        """
        # Entry log — pairs with REQ_IN/REQ_OUT from the request middleware via rid.
        # Question length, not contents, to avoid leaking PII into the log file.
        surface = surface_from_header(x_nexus_surface)
        channel = resolve_channel(surface)

        rid = get_request_id()
        logger.info(
            "CHAT_IN  rid=%s user_id=%s conversation_id=%s model_id=%s surface=%s question_len=%d",
            rid,
            user.id,
            request.conversation_id,
            request.model_id or "<default>",
            surface,
            len(request.question),
        )

        conversation = await get_conversation_service(
            user.id, session, request.conversation_id
        )
        if conversation is None:
            logger.warning(
                "CHAT_404 rid=%s user_id=%s conversation_id=%s",
                rid,
                user.id,
                request.conversation_id,
            )
            raise HTTPException(status_code=404, detail="Conversation not found")

        # Resolve model: request overrides stored model, stored model overrides default
        model_id = request.model_id or conversation.model_id or _DEFAULT_MODEL

        # Persist model change if it differs from what is stored
        if model_id != conversation.model_id:
            await update_conversation_model_service(
                model_id=model_id,
                user_id=user.id,
                conversation_id=request.conversation_id,
                session=session,
            )

        # Read recent history *before* persisting the current message so the
        # current question is not included in the history slice passed to the
        # provider (the provider receives it separately as ``question``).
        recent_rows = await get_messages_for_conversation(
            session, request.conversation_id, limit=_HISTORY_WINDOW
        )
        history = [
            {"role": row.role, "content": row.content or ""}
            for row in recent_rows
            if row.role in {"user", "assistant"}
        ]

        # Persist the user prompt + assistant placeholder rows up front so a
        # client that disconnects mid-stream still has a partial record.
        await append_user_message(
            session,
            conversation_id=request.conversation_id,
            user_id=user.id,
            content=request.question,
        )
        assistant_row = await append_assistant_placeholder(
            session,
            conversation_id=request.conversation_id,
            user_id=user.id,
        )
        assistant_message_id = assistant_row.id
        # Commit before streaming starts — the request session is closed when
        # the StreamingResponse generator runs in a fresh task, so we open a
        # short-lived session inside the generator for the final UPDATE.
        await session.commit()

        provider = resolve_llm(model_id)

        # Resolve the user's default workspace and build file tools.
        # Non-fatal: if no workspace exists yet (e.g. new user who hasn't
        # completed onboarding) the agent runs without file access tools.
        workspace_tools = []
        try:
            workspace = await get_default_workspace(user.id, session)
            if workspace is not None:
                root = Path(workspace.path)
                if root.exists():
                    workspace_tools = make_workspace_tools(root)
        except Exception:
            logger.exception(
                "CHAT_WORKSPACE_TOOLS_ERR rid=%s user_id=%s", rid, user.id
            )

        async def event_stream() -> AsyncGenerator[bytes]:
            """Yield channel-encoded bytes for each LLM event, then done.

            Builds a raw provider stream, wraps it with error handling and
            aggregation, then hands it to ``channel.deliver()`` which
            encodes each event for the surface (SSE frames for web/Electron,
            message edits for Telegram, etc.).
            """
            stream_start = time.perf_counter()
            event_count = 0
            aggregator = ChatTurnAggregator()

            async def _guarded_stream():
                """Wrap the provider stream with error capture + aggregation."""
                nonlocal event_count
                try:
                    async for event in provider.stream(
                        request.question,
                        request.conversation_id,
                        user.id,
                        history=history,
                        tools=workspace_tools or None,
                    ):
                        event_count += 1
                        aggregator.apply(event)
                        yield event
                except Exception as exc:
                    logger.exception(
                        "CHAT_ERR rid=%s conversation_id=%s model_id=%s after %d events",
                        rid,
                        request.conversation_id,
                        model_id,
                        event_count,
                    )
                    error_event: StreamEvent = {"type": "error", "content": str(exc)}
                    aggregator.apply(error_event)
                    yield error_event

            from app.channels.base import ChannelMessage  # noqa: PLC0415

            channel_message: ChannelMessage = {
                "user_id": user.id,
                "conversation_id": request.conversation_id,
                "text": request.question,
                "surface": surface,
                "model_id": model_id,
                "metadata": {},
            }

            try:
                async for chunk in channel.deliver(_guarded_stream(), channel_message):
                    yield chunk
            finally:
                duration_ms = (time.perf_counter() - stream_start) * 1000
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
                    request.conversation_id,
                    model_id,
                    surface,
                    event_count,
                    duration_ms,
                )

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )

    return router
