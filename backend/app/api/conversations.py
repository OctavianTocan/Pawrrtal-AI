"""
This module contains the conversation endpoints for the API.
"""

import uuid
from typing import List, Optional

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


def get_conversations_router() -> APIRouter:
    """Get a router for the conversations API."""
    router = APIRouter(prefix="/api/v1/conversations", tags=["conversations"])

    @router.get("/{conversation_id}/messages")
    async def get_conversation_messages(
        conversation_id: uuid.UUID,
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ) -> Optional[List[Message]]:
        """Return the message history for a conversation.

        Verifies ownership first, then reads from the Agno database using the
        conversation ID as the Agno session ID. Returns an empty list for new
        conversations that have no messages yet.
        """
        conversation = await get_conversation_service(user.id, session, conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        # TODO: Bring in the DB from somewhere, or call some custom agent to do this instead.
        try:
            # Returns the conversation history, using an Agno agent.
            return create_history_reader_agent(conversation_id)
        except (ValueError, KeyError, AttributeError, Exception) as e:
            raise HTTPException(status_code=500, detail=str(e))

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
        """Generate an LLM-based title for a conversation and persist it.

        Uses the first user message as context for the Gemini model to produce
        a short, descriptive title.
        """

        # Title agent one-off.
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
        """List all conversations for the authenticated user, most-recent first."""
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

        The ``conversation_id`` is provided as a path parameter because the
        frontend pre-generates UUIDs before the first message is sent.
        The title will be updated asynchronously via LLM title generation.
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
