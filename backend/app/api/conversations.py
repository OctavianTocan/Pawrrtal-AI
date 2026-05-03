"""
This module contains the conversation endpoints for the API.
"""

import logging
import uuid
from typing import Any, List, Optional

from agno.agent import Message
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.agents import create_history_reader_agent, create_utility_agent
from app.crud.conversation import (
    create_conversation_service,
    delete_conversation_service,
    get_conversation_service,
    get_conversations_for_user_service,
    update_conversation_title_service,
)
from app.db import User, get_async_session
from app.models import Conversation
from app.schemas import ConversationCreate, ConversationResponse, ConversationUpdate
from app.users import current_active_user

# Logger follows module namespace conventions for consistent filtering and tracing.
logger = logging.getLogger(__name__)


def _extract_message_text(
    content: Any, *, _depth: int = 0, _max_depth: int = 5, _max_length: int = 4000
) -> str:
    """Flatten Agno/Gemini message content into safe plain text for the frontend.

    - Limits recursion depth to avoid very deep/recursive structures.
    - Avoids stringifying arbitrary objects to prevent leaking internal structures.
    - Restricts which dict keys are traversed to keep irrelevant fields out of the UI.
    - Applies a max-length cap on the returned text.
    """
    if content is None:
        return ""

    if _depth > _max_depth:
        return ""

    # Fast path for strings
    if isinstance(content, str):
        return content[:_max_length]

    # Bytes: try to decode as UTF-8, otherwise drop
    if isinstance(content, (bytes, bytearray, memoryview)):
        try:
            text = bytes(content).decode("utf-8", errors="ignore")
        except Exception:
            return ""
        return text[:_max_length]

    # Lists/tuples: concatenate child text, respecting depth/length limits
    if isinstance(content, (list, tuple)):
        parts: List[str] = []
        remaining = _max_length
        for item in content:
            if remaining <= 0:
                break
            part = _extract_message_text(
                item, _depth=_depth + 1, _max_depth=_max_depth, _max_length=remaining
            )
            if not part:
                continue
            if len(part) > remaining:
                part = part[:remaining]
            parts.append(part)
            remaining -= len(part)
        return "".join(parts)

    # Dicts: only traverse a limited set of text-like keys to avoid large/irrelevant data
    if isinstance(content, dict):
        candidate_keys = ("text", "content", "message", "output")
        for key in candidate_keys:
            if key in content:
                value = content.get(key)
                if value is not None:
                    return _extract_message_text(
                        value,
                        _depth=_depth + 1,
                        _max_depth=_max_depth,
                        _max_length=_max_length,
                    )
        # If no known text-like keys are present, do not traverse the entire structure
        return ""

    # Avoid str()-casting arbitrary objects (e.g., large tool payloads)
    return ""


def _serialize_chat_history(messages: List[Message]) -> List[dict[str, str]]:
    """Convert Agno messages into the minimal chat shape expected by the UI.

    The response contract for the ConversationPage is intentionally minimal:
    ``{"role": "user"|"assistant", "content": str}``.
    """

    serialized_messages: List[dict[str, str]] = []

    for message in messages:
        if message.role not in {"user", "assistant"}:
            continue

        content = _extract_message_text(message.content)
        if not content:
            continue

        serialized_messages.append({"role": message.role, "content": content})

    return serialized_messages


def _is_missing_session_error(error: Exception) -> bool:
    """Return whether the error indicates an absent Agno session."""

    return "session not found" in str(error).lower()


GENERATED_TITLE_REJECTION_PHRASES = (
    "api key",
    "authentication",
    "unauthorized",
    "invalid request",
    "no api",
    "pass a valid",
    "was provided",
)


def _normalize_generated_title(content: Any) -> str | None:
    """Return a usable generated title, or ``None`` for provider/error text."""

    title = str(content or "").strip().strip('"').strip("'").strip()
    if not title:
        return None

    collapsed_title = " ".join(title.split())
    title_lower = collapsed_title.lower()
    if any(phrase in title_lower for phrase in GENERATED_TITLE_REJECTION_PHRASES):
        return None

    if len(collapsed_title) > 80:
        return None

    return collapsed_title



def get_conversations_router() -> APIRouter:
    """Get a router for the conversations API."""
    router = APIRouter(prefix="/api/v1/conversations", tags=["conversations"])

    @router.get("/{conversation_id}/messages")
    async def get_conversation_messages(
        conversation_id: uuid.UUID,
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ) -> List[dict[str, str]]:
        """Return message history for a conversation.

        Verifies ownership first, then reads from Agno using conversation ID as
        session ID. Returns an empty list for new conversations without history.
        """

        conversation = await get_conversation_service(user.id, session, conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        try:
            return _serialize_chat_history(create_history_reader_agent(conversation_id))
        except Exception as error:
            if _is_missing_session_error(error):
                logger.warning(
                    "No history session found for conversation %s; returning empty history",
                    conversation_id,
                )
                return []

            logger.exception(
                "Error reading conversation history for %s",
                conversation_id,
                exc_info=error,
            )
            raise HTTPException(
                status_code=500,
                detail="Failed to read conversation history",
            ) from error

    @router.get("/{conversation_id}")
    async def get_conversation(
        conversation_id: uuid.UUID,
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ) -> Optional[ConversationResponse]:
        """Return metadata for a single conversation."""
        conversation: Optional[Conversation] = await get_conversation_service(
            user.id, session, conversation_id
        )
        if conversation:
            return ConversationResponse(
                title=conversation.title,
                id=conversation.id,
                user_id=conversation.user_id,
                created_at=conversation.created_at,
                updated_at=conversation.updated_at,
            )
        return None

    @router.post("/{conversation_id}/title")
    async def generate_conversation_title(
        conversation_id: uuid.UUID,
        first_message: str = "",
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ) -> str:
        """Generate and persist a short conversation title from the first message."""

        response = create_utility_agent(
            "Generate a title for the conversation based on the first message: "
            + first_message
            + ". Return only the title, no other text or explanation.",
        )

        generated_title = _normalize_generated_title(response.content)
        if generated_title is None:
            logger.warning(
                "Skipping unusable generated title for conversation %s",
                conversation_id,
            )
            return ""

        await update_conversation_title_service(
            title=generated_title,
            user_id=user.id,
            conversation_id=conversation_id,
            session=session,
        )
        return generated_title

    @router.patch("/{conversation_id}", response_model=ConversationResponse)
    async def update_conversation(
        conversation_id: uuid.UUID,
        payload: ConversationUpdate,
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ) -> ConversationResponse:
        """Update mutable conversation metadata for the authenticated user."""

        normalized_title = payload.title.strip()
        if not normalized_title:
            raise HTTPException(status_code=422, detail="Conversation title cannot be empty")

        conversation = await update_conversation_title_service(
            title=normalized_title,
            user_id=user.id,
            conversation_id=conversation_id,
            session=session,
        )
        if conversation is None:
            raise HTTPException(status_code=404, detail="Conversation not found")

        return ConversationResponse(
            title=conversation.title,
            id=conversation.id,
            user_id=conversation.user_id,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
        )

    @router.delete("/{conversation_id}", status_code=204)
    async def delete_conversation(
        conversation_id: uuid.UUID,
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ) -> None:
        """Delete a conversation owned by the authenticated user."""

        deleted = await delete_conversation_service(user.id, session, conversation_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Conversation not found")

    @router.get("")
    async def list_conversations(
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ) -> List[ConversationResponse]:
        """List all conversations for the authenticated user, most recent first."""
        conversations: List[Conversation] = await get_conversations_for_user_service(
            user.id, session
        )
        return [
            ConversationResponse(
                title=conversation.title,
                id=conversation.id,
                user_id=conversation.user_id,
                created_at=conversation.created_at,
                updated_at=conversation.updated_at,
            )
            for conversation in conversations
        ]

    @router.post("/{conversation_id}")
    async def create_conversation(
        conversation_id: uuid.UUID,
        payload: ConversationCreate | None = Body(default=None),
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ) -> ConversationResponse:
        """Create a new conversation with an immediate initial title.

        Frontend generates the UUID first; this endpoint persists metadata before
        the first streamed turn.
        """

        creation_payload = payload or ConversationCreate()
        new_conversation: Conversation = await create_conversation_service(
            user.id,
            session,
            ConversationCreate(id=conversation_id, title=creation_payload.title),
        )
        return ConversationResponse(
            title=new_conversation.title,
            id=new_conversation.id,
            user_id=new_conversation.user_id,
            created_at=new_conversation.created_at,
            updated_at=new_conversation.updated_at,
        )

    return router
