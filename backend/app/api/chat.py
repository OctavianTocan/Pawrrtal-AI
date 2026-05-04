"""
Chat API — provider-agnostic streaming endpoint.

All AI providers (Claude via Agent SDK, Gemini via Agno, …) expose the
same ``AIProvider.stream()`` interface and emit ``StreamEvent`` TypedDicts.
This module contains exactly one route: ``POST /api/v1/chat/``.

Message persistence
-------------------
The endpoint persists every user and assistant message to the
``messages`` / ``context_items`` tables (Phase 1 LCM foundation).
The user message is written *before* the stream starts so it survives
network errors; the assistant message is written inside the ``finally``
block so it is persisted even when an error event ends the stream early.
"""
from __future__ import annotations

import json
import uuid

from fastapi import Depends, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.routing import APIRouter
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.providers import resolve_provider
from app.crud.conversation import get_conversation_service, update_conversation_model_service
from app.crud.message import create_message
from app.db import User, get_async_session
from app.schemas import ChatRequest
from app.users import current_active_user

_DEFAULT_MODEL = "gemini-3-flash-preview"


def get_chat_router() -> APIRouter:
    router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

    @router.post("/")
    async def chat(
        request: ChatRequest,
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ) -> StreamingResponse:
        """Stream an AI response as Server-Sent Events.

        SSE event shapes:
          {"type": "delta", "content": "..."}      — text chunk
          {"type": "thinking", "content": "..."}   — reasoning (when available)
          {"type": "tool_use", "name": "...", "input": {...}}
          {"type": "tool_result", "content": "..."}
          {"type": "error", "content": "..."}      — stream-level error
          [DONE]

        The provider is resolved from model_id — the endpoint is fully
        provider-agnostic. Changing model_id changes the provider; the
        stream format never changes.
        """
        conversation = await get_conversation_service(
            user.id, session, request.conversation_id
        )
        if conversation is None:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # Resolve model: request > stored > global default.
        # This allows per-message model switching without a separate PATCH.
        model_id = request.model_id or conversation.model_id or _DEFAULT_MODEL

        # Persist model change so the next request inherits it without
        # the client having to re-send model_id every turn.
        if model_id != conversation.model_id:
            await update_conversation_model_service(
                model_id=model_id,
                user_id=user.id,
                conversation_id=request.conversation_id,
                session=session,
            )

        provider = resolve_provider(model_id)

        # Persist the user message *before* streaming starts.  Writing it
        # here (outside the generator) ensures it is committed even if the
        # client disconnects before the first SSE frame is sent.
        await create_message(
            session,
            conversation_id=request.conversation_id,
            user_id=user.id,
            role="user",
            content=request.question,
        )
        await session.commit()

        async def event_stream():
            """Async generator that streams SSE frames to the client.

            Yields one ``data: ...\n\n`` frame per provider event, then
            a final ``data: [DONE]\n\n`` sentinel.  The assistant message
            is persisted inside ``finally`` so it is written regardless of
            whether the stream completes cleanly or raises an exception.
            """
            # Accumulate delta chunks so we can write the full assistant
            # reply as a single Message row once streaming is done.
            full_response_parts: list[str] = []
            try:
                async for event in provider.stream(
                    request.question,
                    request.conversation_id,
                    user.id,
                ):
                    # Only "delta" events carry text we want to persist;
                    # thinking / tool_use / tool_result are forwarded as-is.
                    if isinstance(event, dict) and event.get("type") == "delta":
                        full_response_parts.append(event.get("content", ""))
                    yield f"data: {json.dumps(event)}\n\n"
            except Exception as exc:
                # Surface provider errors to the client as a typed event
                # so the frontend can display them rather than silently hang.
                error_event = {"type": "error", "content": str(exc)}
                yield f"data: {json.dumps(error_event)}\n\n"
            finally:
                # Persist the full assistant reply.  Running in ``finally``
                # guarantees this executes even when an error interrupted
                # the stream mid-way, preserving partial responses.
                if full_response_parts:
                    await create_message(
                        session,
                        conversation_id=request.conversation_id,
                        user_id=None,  # assistant messages have no user owner
                        role="assistant",
                        content="".join(full_response_parts),
                    )
                    await session.commit()
                yield "data: [DONE]\n\n"

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )

    return router
