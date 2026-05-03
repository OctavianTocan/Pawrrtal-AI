"""Unit tests for conversation API helper functions."""

from types import SimpleNamespace

from app.api.conversations import (
    _extract_message_text,
    _is_missing_session_error,
    _normalize_generated_title,
    _serialize_chat_history,
)


def test_extract_message_text_returns_empty_for_none() -> None:
    """None content is serialized as an empty string."""
    assert _extract_message_text(None) == ""


def test_extract_message_text_decodes_bytes() -> None:
    """Byte content is decoded as UTF-8 and capped by max length."""
    assert _extract_message_text(b"hello world", _max_length=5) == "hello"


def test_extract_message_text_concatenates_nested_lists() -> None:
    """Nested list content is flattened while preserving text order."""
    content = ["hello ", {"text": ["from ", {"content": "nested"}]}, {"ignored": "value"}]
    assert _extract_message_text(content) == "hello from nested"


def test_extract_message_text_ignores_unknown_objects() -> None:
    """Arbitrary objects are ignored instead of stringified."""
    assert _extract_message_text(object()) == ""


def test_extract_message_text_respects_depth_limit() -> None:
    """Deeply nested content beyond the configured depth is ignored."""
    content = [[[[[["too deep"]]]]]]
    assert _extract_message_text(content, _max_depth=2) == ""


def test_serialize_chat_history_filters_roles_and_empty_content() -> None:
    """Only user and assistant messages with text content are returned."""
    messages = [
        SimpleNamespace(role="user", content="hello"),
        SimpleNamespace(role="assistant", content={"text": "hi"}),
        SimpleNamespace(role="tool", content="hidden"),
        SimpleNamespace(role="assistant", content={"unknown": "hidden"}),
    ]

    assert _serialize_chat_history(messages) == [
        {"role": "user", "content": "hello"},
        {"role": "assistant", "content": "hi"},
    ]


def test_is_missing_session_error_matches_case_insensitively() -> None:
    """Agno missing-session errors are detected regardless of case."""
    assert _is_missing_session_error(RuntimeError("Session Not Found: abc"))


def test_normalize_generated_title_collapses_valid_title() -> None:
    """Generated titles are stripped, unquoted, and whitespace-normalized."""
    assert _normalize_generated_title('"  Build   a test suite  "') == "Build a test suite"


def test_normalize_generated_title_rejects_provider_error_text() -> None:
    """Provider/authentication error text is not persisted as a title."""
    assert _normalize_generated_title("No API key was provided") is None


def test_normalize_generated_title_rejects_long_titles() -> None:
    """Overly long generated titles are rejected."""
    assert _normalize_generated_title("x" * 81) is None
