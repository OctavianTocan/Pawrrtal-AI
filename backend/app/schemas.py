"""Pydantic schemas for API request/response validation.

These are *not* database models — they define the shape of data flowing
through the API layer.
"""

import uuid
from datetime import datetime
from typing import Annotated, Any, Literal

from fastapi_users import schemas
from pydantic import BaseModel, StringConstraints

# --- User schemas (provided by fastapi-users) --------------------------------


class UserRead(schemas.BaseUser[uuid.UUID]):
    """Response schema for user data (id, email, is_active, etc.)."""

    pass


class UserCreate(schemas.BaseUserCreate):
    """Request schema for user registration (email, password, invite_code)."""

    # ``invite_code`` is a gate-check field: it's validated in
    # ``UserManager.create()`` (users.py) to verify the user has a valid
    # invite before registration is allowed. It is NOT a database column —
    # it exists only on this schema.
    #
    # Problem: fastapi-users converts this schema to a dict and passes it
    # to ``User(**dict)`` (the SQLAlchemy model). If ``invite_code`` is
    # still in that dict, SQLAlchemy crashes because ``User`` has no such
    # column.
    #
    # Solution: override the two methods fastapi-users uses to convert
    # this schema to a dict (``create_update_dict`` for safe=True,
    # ``create_update_dict_superuser`` for safe=False) and strip
    # ``invite_code`` so it never reaches the database layer.
    invite_code: str = ""

    def create_update_dict(self):
        """Strip ``invite_code`` from the safe (non-superuser) update dict before persistence."""
        d = super().create_update_dict()
        d.pop("invite_code", None)
        return d

    def create_update_dict_superuser(self):
        """Strip ``invite_code`` from the superuser update dict before persistence."""
        d = super().create_update_dict_superuser()
        d.pop("invite_code", None)
        return d


class UserUpdate(schemas.BaseUserUpdate):
    """Request schema for updating user profile."""

    pass


# --- Conversation schemas ----------------------------------------------------


ConversationTitle = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=255),
]


class ConversationCreate(BaseModel):
    """Request schema for creating a conversation.

    The ``id`` is optional — when provided, the backend uses it as the
    primary key (allowing the frontend to pre-generate UUIDs). The optional
    title lets the frontend immediately show a first-message fallback before
    LLM title generation finishes.
    """

    id: uuid.UUID | None = None
    title: ConversationTitle | None = None


class ConversationResponse(BaseModel):
    """Response schema returned for conversation endpoints."""

    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime
    is_archived: bool = False
    is_flagged: bool = False
    is_unread: bool = False
    status: str | None = None
    model_id: str | None = None


class ConversationUpdate(BaseModel):
    """Request schema for updating mutable conversation fields."""

    title: ConversationTitle | None = None
    is_archived: bool | None = None
    is_flagged: bool | None = None
    is_unread: bool | None = None
    status: str | None = None
    model_id: str | None = None  # optional — only set when changing model


# --- Chat schemas -------------------------------------------------------------


class ChatRequest(BaseModel):
    """Request schema for the ``POST /api/v1/chat`` streaming endpoint.

    Attributes:
        question: The user's message to send to the Agno agent.
        conversation_id: UUID linking this message to a conversation.
        model_id: The ID of the model to use for the agent. (Just Gemini models right now).
    """

    question: str
    conversation_id: uuid.UUID
    model_id: str | None = None


class ChatResponse(BaseModel):
    """Response schema for non-streaming chat responses.

    Attributes:
        response: The agent's reply text.
    """

    response: str


# --- Chat history schemas -----------------------------------------------------


class ChatMessageRead(BaseModel):
    """Single rehydrated chat message returned by ``GET /conversations/:id/messages``.

    Mirrors the `AgnoMessage` shape consumed by the frontend so the chat UI
    can render past turns with the same chain-of-thought, tool steps, source
    chips, and reasoning duration as the live stream produced.
    """

    role: Literal["user", "assistant"]
    content: str
    thinking: str | None = None
    # The frontend expects the snake_case field names below; matching them here
    # avoids a serializer alias dance on the read path.
    tool_calls: list[dict[str, Any]] | None = None
    timeline: list[dict[str, Any]] | None = None
    thinking_duration_seconds: int | None = None
    assistant_status: Literal["streaming", "complete", "failed"] | None = None
