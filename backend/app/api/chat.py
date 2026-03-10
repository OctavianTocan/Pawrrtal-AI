"""
This module defines the API routes for chat-related operations.
"""

import json
from typing import Any, Generator

from fastapi import Depends
from fastapi.exceptions import HTTPException
from fastapi.responses import StreamingResponse
from fastapi.routing import APIRouter
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.agents import create_agent
from app.crud.conversation import get_conversation_service
from app.db import User, get_async_session
from app.schemas import ChatRequest
from app.users import current_active_user


def get_chat_router() -> APIRouter:
    # Create the router.
    router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

    @router.post("/")
    async def chat(
        request: ChatRequest,
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ) -> StreamingResponse:
        """Stream an Agno agent response as Server-Sent Events.

        Architecture:
            - Application DB stores conversation metadata (title, user_id, timestamps).
            - Agno DB stores actual message content and history.
            - They are linked by ``Conversation.id`` == Agno ``session_id``.

        Flow:
            1. Frontend creates conversation via ``POST /api/v1/conversations``.
            2. Frontend sends chat with ``conversation_id``.
            3. Backend uses ``conversation_id`` as Agno's ``session_id``.
            4. Agno persists messages under that session.

        SSE payload format:
            - ``{"type": "delta", "content": "..."}`` for each streamed chunk.
            - ``[DONE]`` sentinel when the response is complete.
        """
        conversation_id = request.conversation_id

        # Ownership check — ensure the conversation belongs to this user.
        user_conversation = await get_conversation_service(
            user.id, session, conversation_id
        )
        if user_conversation is None:
            raise HTTPException(status_code=404, detail="Conversation not found")

        agno_agent = create_agent(user.id, conversation_id, request.model_id)

        def event_stream() -> Generator[str, Any, None]:
            """Yield SSE-formatted chunks from the Agno agent."""
            for ev in agno_agent.run(request.question, stream=True):
                chunk = getattr(ev, "content", None)
                if chunk:
                    payload = {"type": "delta", "content": chunk}
                    yield f"data: {json.dumps(payload)}\n\n"
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
