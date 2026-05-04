"""Chat API — provider-agnostic streaming endpoint."""
from __future__ import annotations

import json
import logging
import time
import uuid

from fastapi import Depends, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.routing import APIRouter
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.providers import resolve_provider
from app.core.request_logging import get_request_id
from app.crud.conversation import get_conversation_service, update_conversation_model_service
from app.db import User, get_async_session
from app.schemas import ChatRequest
from app.users import current_active_user

logger = logging.getLogger(__name__)

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
        # Entry log — pairs with REQ_IN/REQ_OUT from the request middleware via rid.
        # Question length, not contents, to avoid leaking PII into the log file.
        rid = get_request_id()
        logger.info(
            "CHAT_IN  rid=%s user_id=%s conversation_id=%s model_id=%s question_len=%d",
            rid,
            user.id,
            request.conversation_id,
            request.model_id or "<default>",
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

        provider = resolve_provider(model_id)

        async def event_stream():
            stream_start = time.perf_counter()
            event_count = 0
            try:
                async for event in provider.stream(
                    request.question,
                    request.conversation_id,
                    user.id,
                ):
                    event_count += 1
                    yield f"data: {json.dumps(event)}\n\n"
            except Exception as exc:
                # Logged with full traceback so the file has enough info to triage
                # without needing to also tail stdout. Always pair with a CHAT_ERR
                # marker so the corresponding REQ_OUT can be matched by rid.
                logger.exception(
                    "CHAT_ERR rid=%s conversation_id=%s model_id=%s after %d events",
                    rid,
                    request.conversation_id,
                    model_id,
                    event_count,
                )
                error_event = {"type": "error", "content": str(exc)}
                yield f"data: {json.dumps(error_event)}\n\n"
            finally:
                duration_ms = (time.perf_counter() - stream_start) * 1000
                logger.info(
                    "CHAT_OUT rid=%s conversation_id=%s model_id=%s events=%d duration_ms=%.1f",
                    rid,
                    request.conversation_id,
                    model_id,
                    event_count,
                    duration_ms,
                )
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
