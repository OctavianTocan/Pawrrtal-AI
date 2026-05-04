"""
SQLAlchemy ORM models for the application database.

Note: The ``User`` model lives in ``db.py`` because fastapi-users needs it
at import time. All other domain models are defined here.
"""

import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Uuid
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text
from sqlalchemy_utils import StringEncryptedType
from sqlalchemy_utils.types.encrypted.encrypted_type import FernetEngine

from app.core import config

from .db import Base


class SenderType(Enum):
    """Identifies who sent a message in a conversation."""

    AI = "ai"
    USER = "user"


class Conversation(Base):
    """
    Conversation metadata stored in the application database.

    Actual message content is persisted by the Agno library in its own database. The two are linked via ``Conversation.id`` ==
    Agno's ``session_id``.
    """

    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("user.id", ondelete="CASCADE")
    )
    title: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    is_unread: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    status: Mapped[str | None] = mapped_column(String(20), nullable=True)  # "todo"|"in_progress"|"done"|null
    model_id: Mapped[str | None] = mapped_column(String(100), nullable=True)


class UserPreferences(Base):
    """
    User preferences stored in the application database.
    """

    __tablename__ = "user_preferences"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("user.id", ondelete="CASCADE"), primary_key=True
    )
    custom_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    accent_color: Mapped[str | None] = mapped_column(String(7), nullable=True)
    font_size: Mapped[int] = mapped_column()


class APIKey(Base):
    """
    API key for a user's provider account.
    """

    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("user.id", ondelete="CASCADE")
    )
    provider: Mapped[str] = mapped_column(String(50))
    encrypted_key: Mapped[str] = mapped_column(
        StringEncryptedType(String, config.settings.fernet_key, FernetEngine)
    )
    is_active: Mapped[bool] = mapped_column(default=True)


class Message(Base):
    """A single message in a conversation (user, assistant, thinking, tool_use, tool_result)."""

    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("user.id", ondelete="CASCADE"), nullable=True
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ordinal: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ContextItem(Base):
    """Ordered context window entry — points to a Message or Summary."""

    __tablename__ = "context_items"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False
    )
    item_type: Mapped[str] = mapped_column(String(10), nullable=False)  # message | summary
    item_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    ordinal: Mapped[int] = mapped_column(Integer, nullable=False)
    token_count: Mapped[int | None] = mapped_column(Integer, nullable=True)


class Summary(Base):
    """A compacted summary that replaces a range of messages in the context window."""

    __tablename__ = "summaries"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False
    )
    depth: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source_ids: Mapped[list[uuid.UUID] | None] = mapped_column(ARRAY(Uuid), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
