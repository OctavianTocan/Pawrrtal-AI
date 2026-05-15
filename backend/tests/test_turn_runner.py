"""Tests for the shared turn-runner pipeline helpers.

Covers:
  - _expand_hook_events: empty hooks, single hook, multiple hooks.
  - _workspace_system_prompt: None root returns None; real root delegates.
  - ChatTurnInput: frozen dataclass, default field values.
  - _EventCounter: default value and mutation.
"""

from __future__ import annotations

import uuid
from pathlib import Path
from types import SimpleNamespace
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from app.channels.turn_runner import (
    ChatTurnInput,
    EventHook,
    _EventCounter,
    _expand_hook_events,
    _workspace_system_prompt,
)


# ---------------------------------------------------------------------------
# Helpers — shared stubs
# ---------------------------------------------------------------------------


def _make_event(content: str = "test") -> dict[str, str]:
    return {"type": "delta", "content": content}


def _make_minimal_turn_input(**overrides: Any) -> ChatTurnInput:
    """Build a ChatTurnInput with only the required fields set."""
    defaults: dict[str, Any] = {
        "conversation_id": uuid.uuid4(),
        "user_id": uuid.uuid4(),
        "question": "Hello",
        "provider": MagicMock(),
        "channel": MagicMock(),
        "channel_message": {
            "user_id": uuid.uuid4(),
            "conversation_id": uuid.uuid4(),
            "text": "Hello",
            "surface": "web",
            "model_id": "test/model",
            "metadata": {},
        },
    }
    defaults.update(overrides)
    return ChatTurnInput(**defaults)


# ---------------------------------------------------------------------------
# _expand_hook_events
# ---------------------------------------------------------------------------


def test_expand_hook_events_empty_hooks_yields_nothing() -> None:
    """No hooks → no extra events."""
    event = _make_event()
    extras = list(_expand_hook_events(event, []))
    assert extras == []


def test_expand_hook_events_hook_returning_empty_list_yields_nothing() -> None:
    """A hook that returns an empty list contributes nothing."""
    hook: EventHook = lambda e: []  # noqa: E731
    event = _make_event()
    extras = list(_expand_hook_events(event, [hook]))
    assert extras == []


def test_expand_hook_events_single_hook_yields_its_events() -> None:
    """Events returned by a hook are yielded."""
    extra_event = {"type": "artifact", "content": "payload"}
    hook: EventHook = lambda e: [extra_event]  # noqa: E731
    event = _make_event()
    extras = list(_expand_hook_events(event, [hook]))
    assert extras == [extra_event]


def test_expand_hook_events_multiple_hooks_all_combined() -> None:
    """All hooks are called and their events concatenated in order."""
    hook_a: EventHook = lambda e: [{"type": "a", "content": "from-a"}]  # noqa: E731
    hook_b: EventHook = lambda e: [{"type": "b", "content": "from-b"}]  # noqa: E731
    event = _make_event()
    extras = list(_expand_hook_events(event, [hook_a, hook_b]))
    assert len(extras) == 2
    assert extras[0]["type"] == "a"
    assert extras[1]["type"] == "b"


def test_expand_hook_events_hook_returning_multiple_events() -> None:
    """A single hook can return more than one extra event."""
    hook: EventHook = lambda e: [  # noqa: E731
        {"type": "x", "content": "first"},
        {"type": "x", "content": "second"},
    ]
    event = _make_event()
    extras = list(_expand_hook_events(event, [hook]))
    assert len(extras) == 2
    assert extras[0]["content"] == "first"
    assert extras[1]["content"] == "second"


def test_expand_hook_events_hook_receives_the_upstream_event() -> None:
    """The original event is passed to every hook."""
    received: list[Any] = []

    def recording_hook(e: Any) -> list[Any]:
        received.append(e)
        return []

    original = {"type": "delta", "content": "original"}
    list(_expand_hook_events(original, [recording_hook]))
    assert received == [original]


# ---------------------------------------------------------------------------
# _workspace_system_prompt
# ---------------------------------------------------------------------------


def test_workspace_system_prompt_returns_none_for_none_root() -> None:
    """When workspace_root is None, no prompt assembly is attempted."""
    result = _workspace_system_prompt(None)
    assert result is None


def test_workspace_system_prompt_calls_assemble_with_root(tmp_path: Path) -> None:
    """When workspace_root is provided, assemble_workspace_prompt is called."""
    with patch(
        "app.channels.turn_runner.assemble_workspace_prompt",
        return_value="# AGENTS",
    ) as mock_assemble:
        result = _workspace_system_prompt(tmp_path)

    mock_assemble.assert_called_once_with(tmp_path)
    assert result == "# AGENTS"


def test_workspace_system_prompt_returns_none_when_assemble_returns_none(
    tmp_path: Path,
) -> None:
    """If assemble_workspace_prompt returns None (no files), propagate None."""
    with patch(
        "app.channels.turn_runner.assemble_workspace_prompt",
        return_value=None,
    ):
        result = _workspace_system_prompt(tmp_path)

    assert result is None


# ---------------------------------------------------------------------------
# ChatTurnInput — frozen dataclass defaults
# ---------------------------------------------------------------------------


def test_chat_turn_input_default_history_window() -> None:
    """history_window defaults to 20."""
    turn = _make_minimal_turn_input()
    assert turn.history_window == 20


def test_chat_turn_input_default_log_tag() -> None:
    """log_tag defaults to 'TURN'."""
    turn = _make_minimal_turn_input()
    assert turn.log_tag == "TURN"


def test_chat_turn_input_default_log_extras() -> None:
    """log_extras defaults to an empty dict."""
    turn = _make_minimal_turn_input()
    assert turn.log_extras == {}


def test_chat_turn_input_default_workspace_root_is_none() -> None:
    """workspace_root defaults to None."""
    turn = _make_minimal_turn_input()
    assert turn.workspace_root is None


def test_chat_turn_input_default_tools_is_none() -> None:
    """tools defaults to None."""
    turn = _make_minimal_turn_input()
    assert turn.tools is None


def test_chat_turn_input_default_reasoning_effort_is_none() -> None:
    """reasoning_effort defaults to None."""
    turn = _make_minimal_turn_input()
    assert turn.reasoning_effort is None


def test_chat_turn_input_default_db_session_is_none() -> None:
    """db_session defaults to None."""
    turn = _make_minimal_turn_input()
    assert turn.db_session is None


def test_chat_turn_input_is_frozen() -> None:
    """ChatTurnInput is a frozen dataclass — mutation must raise."""
    turn = _make_minimal_turn_input()
    with pytest.raises((AttributeError, TypeError)):
        turn.question = "changed"  # type: ignore[misc]


def test_chat_turn_input_custom_values_stored() -> None:
    """Explicitly passed values are stored correctly."""
    cid = uuid.uuid4()
    uid = uuid.uuid4()
    root = Path("/tmp/ws")
    turn = _make_minimal_turn_input(
        conversation_id=cid,
        user_id=uid,
        question="What is up?",
        workspace_root=root,
        history_window=10,
        log_tag="TELEGRAM",
        log_extras={"chat_id": 42},
        reasoning_effort="high",
    )
    assert turn.conversation_id == cid
    assert turn.user_id == uid
    assert turn.question == "What is up?"
    assert turn.workspace_root == root
    assert turn.history_window == 10
    assert turn.log_tag == "TELEGRAM"
    assert turn.log_extras == {"chat_id": 42}
    assert turn.reasoning_effort == "high"


# ---------------------------------------------------------------------------
# _EventCounter
# ---------------------------------------------------------------------------


def test_event_counter_default_value_is_zero() -> None:
    """_EventCounter starts at zero."""
    counter = _EventCounter()
    assert counter.value == 0


def test_event_counter_is_mutable() -> None:
    """_EventCounter is a plain dataclass (not frozen) and can be incremented."""
    counter = _EventCounter()
    counter.value += 1
    counter.value += 1
    assert counter.value == 2


def test_event_counter_custom_initial_value() -> None:
    """_EventCounter accepts a custom initial value."""
    counter = _EventCounter(value=5)
    assert counter.value == 5
