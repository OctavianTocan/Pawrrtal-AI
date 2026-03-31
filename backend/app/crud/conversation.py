"""
CRUD operations for the Conversation model.

All functions enforce user ownership — a user can only access or modify
their own conversations.
"""

import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio.session import AsyncSession

from app.models import Conversation
from app.schemas import ConversationCreate


async def create_conversation_service(
    user_id: uuid.UUID, session: AsyncSession, schema_data: ConversationCreate
) -> Conversation:
    """Create a new conversation with a default title.

    The title starts as "New Conversation" and is later replaced by an
    LLM-generated title based on the first message.

    Args:
        user_id: Owner of the conversation.
        session: Async database session.
        schema_data: Creation payload (may include a pre-generated UUID).

    Returns:
        The newly created ``Conversation`` row.
    """
    new_conversation = Conversation(
        id=schema_data.id,
        user_id=user_id,
        title="New Conversation",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    session.add(new_conversation)
    await session.commit()
    await session.refresh(new_conversation)
    return new_conversation


async def get_conversation_service(
    user_id: uuid.UUID, session: AsyncSession, conversation_id: uuid.UUID
) -> Optional[Conversation]:
    """Retrieve a single conversation by ID, scoped to the given user.

    Args:
        user_id: Owner to match against.
        session: Async database session.
        conversation_id: The conversation to look up.

    Returns:
        The ``Conversation`` if found and owned by ``user_id``, else ``None``.
    """
    stmt = (
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .where(Conversation.user_id == user_id)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_conversations_for_user_service(
    user_id: uuid.UUID, session: AsyncSession
) -> List[Conversation]:
    """Retrieve all conversations for a user, most-recent first.

    Args:
        user_id: Owner whose conversations to fetch.
        session: Async database session.

    Returns:
        List of ``Conversation`` objects ordered by ``updated_at`` descending.
    """
    stmt = (
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def update_conversation_title_service(
    title: str, user_id: uuid.UUID, conversation_id: uuid.UUID, session: AsyncSession
) -> Optional[Conversation]:
    """Update the title of an existing conversation.

    Args:
        title: The new title to set.
        user_id: Owner to match against (ownership check).
        conversation_id: The conversation to update.
        session: Async database session.

    Returns:
        The updated ``Conversation``, or ``None`` if not found / not owned.
    """
    stmt = (
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .where(Conversation.user_id == user_id)
    )
    result = await session.execute(stmt)
    conversation = result.scalar_one_or_none()

    if conversation is None:
        return None

    conversation.title = title
    conversation.updated_at = datetime.now()
    session.add(conversation)
    await session.commit()
    await session.refresh(conversation)
    return conversation


async def delete_conversation_service(
    user_id: uuid.UUID, session: AsyncSession, conversation_id: uuid.UUID
) -> bool:
    """Delete an existing conversation owned by the given user.

    Returns:
        ``True`` when a conversation was deleted, otherwise ``False``.
    """
    stmt = (
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .where(Conversation.user_id == user_id)
    )
    result = await session.execute(stmt)
    conversation = result.scalar_one_or_none()

    if conversation is None:
        return False

    await session.delete(conversation)
    await session.commit()
    return True
