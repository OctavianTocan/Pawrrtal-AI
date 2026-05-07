"""Tests for provider routing and schema behavior."""

from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.core.providers.gemini_provider import GeminiLLM
from app.core.providers.claude_provider import ClaudeLLM
from app.core.providers.factory import resolve_llm
from app.schemas import ConversationCreate, ConversationUpdate, UserCreate


def test_resolve_llm_routes_claude_models_to_claude_provider() -> None:
    """Claude model IDs are routed to the Claude provider."""
    assert isinstance(resolve_llm("claude-sonnet-4-6"), ClaudeLLM)


def test_resolve_llm_routes_default_and_gemini_to_agno_provider() -> None:
    """Gemini and blank model IDs are routed to Agno."""
    assert isinstance(resolve_llm("gemini-3-flash-preview"), GeminiLLM)
    assert isinstance(resolve_llm(None), GeminiLLM)
    assert isinstance(resolve_llm("  "), GeminiLLM)


def test_conversation_create_accepts_optional_client_uuid() -> None:
    """ConversationCreate accepts optional frontend-generated UUIDs."""
    conversation_id = uuid4()
    payload = ConversationCreate(id=conversation_id, title="Hello")

    assert payload.id == conversation_id
    assert payload.title == "Hello"


def test_conversation_create_rejects_blank_title() -> None:
    """ConversationCreate enforces non-empty titles when a title is provided."""
    with pytest.raises(ValidationError):
        ConversationCreate(title="   ")


def test_conversation_update_accepts_metadata_only_payload() -> None:
    """ConversationUpdate allows status-only sidebar metadata updates."""
    payload = ConversationUpdate(status="done")

    assert payload.title is None
    assert payload.status == "done"


def test_user_create_strips_invite_code_from_create_update_dict() -> None:
    """Invite codes do not leak into SQLAlchemy user creation payloads."""
    user = UserCreate(
        email="new@example.com",
        password="password123",
        invite_code="secret",
    )

    assert "invite_code" not in user.create_update_dict()
    assert "invite_code" not in user.create_update_dict_superuser()
