"""
This module contains the conversation endpoints for the API.
"""

import logging
import uuid
from typing import Any, List, Optional

from agno.agent import Message
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.agents import create_history_reader_agent, create_utility_agent
from app.crud.conversation import (
    create_conversation_service,
    get_conversation_service,
    get_conversations_for_user_service,
    update_conversation_title_service,
)
from app.db import User, get_async_session
from app.models import Conversation
from app.schemas import ConversationCreate, ConversationResponse
from app.users import current_active_user

# Logger follows module namespace conventions for consistent filtering and tracing.
logger = logging.getLogger(__name__)


def _extract_message_text(content: Any) -> str:
    """Flatten nested Agno/Gemini content into a plain text message body."""
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(_extract_message_text(item) for item in content)
    if isinstance(content, dict):
        for key in ("text", "content"):
            text = _extract_message_text(content.get(key))
            if text:
                return text
        return "".join(_extract_message_text(value) for value in content.values())
    return str(content)


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

        await update_conversation_title_service(
            title=str(response.content or ""),
            user_id=user.id,
            conversation_id=conversation_id,
            session=session,
        )
        return str(response.content or "")

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
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ) -> ConversationResponse:
        """Create a new conversation with a default title.

        Frontend generates the UUID first; this endpoint persists metadata before
        the first streamed turn.
        """

        new_conversation: Conversation = await create_conversation_service(
            user.id, session, ConversationCreate(id=conversation_id)
        )
        return ConversationResponse(
            title=new_conversation.title,
            id=new_conversation.id,
            user_id=new_conversation.user_id,
            created_at=new_conversation.created_at,
            updated_at=new_conversation.updated_at,
        )

    return router
