"""SQLAlchemy ORM models for the application database.

Note: The ``User`` model lives in ``db.py`` because fastapi-users needs it
at import time. All other domain models are defined here.
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Uuid
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
    """Conversation metadata stored in the application database.

    Actual message content is persisted by the Agno library in its own database. The two are linked via ``Conversation.id`` ==
    Agno's ``session_id``.
    """

    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("user.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    is_unread: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    status: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )  # "todo"|"in_progress"|"done"|null
    model_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # JSON array of label IDs (e.g. ["bug", "feature"]). Validated against
    # the frontend pre-defined CHAT_LABELS list — the backend stores raw
    # IDs without enforcement so adding a new label client-side does not
    # require a migration. Defaults to an empty list rather than NULL so
    # `Conversation.labels.append(...)` always works without a None guard.
    labels: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    # Optional FK to the project this conversation belongs to. NULL means
    # the conversation lives in the unattached "Chats" list at the bottom
    # of the sidebar; setting it surfaces the row under the project's
    # nested children. ON DELETE SET NULL so removing a project keeps the
    # conversations around and just unattaches them.
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )


class Project(Base):
    """Top-level project users can drop conversations into.

    Pure organizational container — has no settings of its own today.
    Conversations point at it via ``Conversation.project_id``; deleting
    the project sets every linked conversation's ``project_id`` back to
    NULL rather than cascading.
    """

    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("user.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class UserPreferences(Base):
    """User preferences stored in the application database."""

    __tablename__ = "user_preferences"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("user.id", ondelete="CASCADE"), primary_key=True
    )
    custom_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    accent_color: Mapped[str | None] = mapped_column(String(7), nullable=True)
    font_size: Mapped[int] = mapped_column()


class UserPersonalization(Base):
    """Personalization profile filled in by the home-page wizard.

    1:1 with `user`. Every field is nullable so a partial profile (e.g.
    user skipped the ChatGPT-context step) round-trips cleanly through
    GET / PUT without coercing missing fields into empty strings.
    """

    __tablename__ = "user_personalization"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("user.id", ondelete="CASCADE"), primary_key=True
    )
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    company_website: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    linkedin: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    role: Mapped[str | None] = mapped_column(String(255), nullable=True)
    goals: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    connected_channels: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    chatgpt_context: Mapped[str | None] = mapped_column(Text, nullable=True)
    personality: Mapped[str | None] = mapped_column(String(64), nullable=True)
    custom_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class APIKey(Base):
    """API key for a user's provider account."""

    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("user.id", ondelete="CASCADE"))
    provider: Mapped[str] = mapped_column(String(50))
    encrypted_key: Mapped[str] = mapped_column(
        StringEncryptedType(String, config.settings.fernet_key, FernetEngine)
    )
    is_active: Mapped[bool] = mapped_column(default=True)


class ChatMessage(Base):
    """A single chat message within a conversation, including reasoning state.

    This is the source of truth for what the chat UI renders on a refresh:
    role, plain-text content, thinking/reasoning text, tool invocations and
    their results, the arrival-ordered timeline, and the reasoning duration.
    Provider-agnostic — both Agno-backed and Claude-backed turns write here.

    Note: Agno also keeps its own message log for context-window plumbing on
    the next turn. That log is not used for rendering history; this table is.
    """

    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("conversations.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("user.id", ondelete="CASCADE"))
    # Stable insertion order within a conversation. Only ever increases —
    # regenerate replaces the row in place rather than allocating a new ordinal.
    ordinal: Mapped[int] = mapped_column(Integer)
    role: Mapped[str] = mapped_column(String(20))  # "user" | "assistant"
    content: Mapped[str] = mapped_column(Text, default="")
    thinking: Mapped[str | None] = mapped_column(Text, nullable=True)
    # JSON arrays — None when absent so the column shrinks to NULL on reads.
    tool_calls: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON, nullable=True)
    timeline: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON, nullable=True)
    thinking_duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # "streaming" | "complete" | "failed" — only meaningful on assistant rows.
    assistant_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)
