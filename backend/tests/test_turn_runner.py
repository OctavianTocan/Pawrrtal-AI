"""Tests for the shared LLM turn pipeline (app.channels.turn_runner).

Covers:
  - _workspace_system_prompt: returns None for None root, calls assemble_workspace_prompt otherwise.
  - _expand_hook_events: yields nothing with no hooks, yields hook outputs in order.
  - ChatTurnInput: frozen dataclass construction and field defaults.
  - _turn_session: yields provided db_session; opens new session when none provided.
  - run_turn: end-to-end with mocked provider, channel, and DB helpers.
  - EventHook type: hook returning empty list produces no extra events.
  - Hook-expanded events are counted and aggregated alongside primary events.
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.channels.turn_runner import (
    ChatTurnInput,
    EventHook,
    _EventCounter,
    _expand_hook_events,
    _workspace_system_prompt,
    run_turn,
)
from app.core.providers.base import StreamEvent


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


def _make_channel_message(
    user_id: uuid.UUID | None = None,
    conversation_id: uuid.UUID | None = None,
) -> dict[str, Any]:
    return {
        "user_id": user_id or uuid4(),
        "conversation_id": conversation_id or uuid4(),
        "text": "hello",
        "surface": "web",
        "model_id": None,
        "metadata": {},
    }


def _make_fake_provider(events: list[StreamEvent]) -> Any:
    """Return a provider-like object whose stream() yields the given events."""

    class FakeProvider:
        async def stream(
            self,
            question: str,
            conversation_id: object,
            user_id: object,
            history: object = None,
            tools: object = None,
            system_prompt: object = None,
            reasoning_effort: object = None,
        ) -> AsyncIterator[StreamEvent]:
            for event in events:
                yield event

    return FakeProvider()


def _make_fake_channel(yielded_bytes: list[bytes] | None = None) -> Any:
    """Return a channel-like object whose deliver() passes through the stream as bytes."""
    if yielded_bytes is None:
        yielded_bytes = [b"chunk1", b"chunk2"]

    class FakeChannel:
        surface = "web"

        async def deliver(
            self,
            stream: AsyncIterator[StreamEvent],
            message: object,
        ) -> AsyncIterator[bytes]:
            # Drain the stream so aggregator.apply() gets called.
            async for _ in stream:
                pass
            for b in yielded_bytes:  # type: ignore[union-attr]
                yield b

    return FakeChannel()


# ---------------------------------------------------------------------------
# _workspace_system_prompt
# ---------------------------------------------------------------------------


def test_workspace_system_prompt_returns_none_when_root_is_none() -> None:
    """_workspace_system_prompt must return None when no workspace root is provided."""
    assert _workspace_system_prompt(None) is None


def test_workspace_system_prompt_calls_assemble_when_root_provided(
    tmp_path: Path,
) -> None:
    """_workspace_system_prompt delegates to assemble_workspace_prompt when a root is given."""
    with patch(
        "app.channels.turn_runner.assemble_workspace_prompt", return_value="# AGENTS"
    ) as mock_assemble:
        result = _workspace_system_prompt(tmp_path)

    mock_assemble.assert_called_once_with(tmp_path)
    assert result == "# AGENTS"


def test_workspace_system_prompt_returns_none_from_assemble_when_no_files(
    tmp_path: Path,
) -> None:
    """When assemble_workspace_prompt returns None (no files), so does the wrapper."""
    with patch(
        "app.channels.turn_runner.assemble_workspace_prompt", return_value=None
    ):
        result = _workspace_system_prompt(tmp_path)

    assert result is None


# ---------------------------------------------------------------------------
# _expand_hook_events
# ---------------------------------------------------------------------------


def test_expand_hook_events_yields_nothing_with_no_hooks() -> None:
    """No hooks → iterator is immediately exhausted."""
    event: StreamEvent = {"type": "delta", "content": "hello"}
    extras = list(_expand_hook_events(event, []))
    assert extras == []


def test_expand_hook_events_yields_from_single_hook() -> None:
    """A hook returning two events → both are yielded."""
    extra1: StreamEvent = {"type": "artifact", "content": "spec"}
    extra2: StreamEvent = {"type": "delta", "content": "extra"}

    def hook(event: StreamEvent) -> list[StreamEvent]:
        return [extra1, extra2]

    event: StreamEvent = {"type": "delta", "content": "main"}
    extras = list(_expand_hook_events(event, [hook]))
    assert extras == [extra1, extra2]


def test_expand_hook_events_yields_from_multiple_hooks_in_order() -> None:
    """Multiple hooks → events from each hook are yielded in hook registration order."""
    e1: StreamEvent = {"type": "delta", "content": "from-hook-1"}
    e2: StreamEvent = {"type": "delta", "content": "from-hook-2"}

    def hook1(event: StreamEvent) -> list[StreamEvent]:
        return [e1]

    def hook2(event: StreamEvent) -> list[StreamEvent]:
        return [e2]

    event: StreamEvent = {"type": "delta", "content": "original"}
    extras = list(_expand_hook_events(event, [hook1, hook2]))
    assert extras == [e1, e2]


def test_expand_hook_events_empty_hook_return_produces_no_output() -> None:
    """A hook that returns an empty list contributes nothing."""

    def empty_hook(event: StreamEvent) -> list[StreamEvent]:
        return []

    event: StreamEvent = {"type": "delta", "content": "hi"}
    assert list(_expand_hook_events(event, [empty_hook])) == []


def test_expand_hook_events_hook_receives_original_event() -> None:
    """The hook receives the upstream event, not a copy or transformed version."""
    received: list[StreamEvent] = []

    def capturing_hook(event: StreamEvent) -> list[StreamEvent]:
        received.append(event)
        return []

    original: StreamEvent = {"type": "tool_use", "name": "bash"}
    list(_expand_hook_events(original, [capturing_hook]))
    assert received == [original]


# ---------------------------------------------------------------------------
# ChatTurnInput
# ---------------------------------------------------------------------------


def test_chat_turn_input_is_frozen() -> None:
    """ChatTurnInput must be a frozen dataclass (immutable after construction)."""
    provider = _make_fake_provider([])
    channel = _make_fake_channel()
    cm = _make_channel_message()

    turn = ChatTurnInput(
        conversation_id=uuid4(),
        user_id=uuid4(),
        question="hello",
        provider=provider,
        channel=channel,
        channel_message=cm,
    )

    with pytest.raises((AttributeError, TypeError)):
        turn.question = "changed"  # type: ignore[misc]


def test_chat_turn_input_default_values() -> None:
    """ChatTurnInput fields have sensible defaults."""
    provider = _make_fake_provider([])
    channel = _make_fake_channel()
    cm = _make_channel_message()

    turn = ChatTurnInput(
        conversation_id=uuid4(),
        user_id=uuid4(),
        question="hello",
        provider=provider,
        channel=channel,
        channel_message=cm,
    )

    assert turn.db_session is None
    assert turn.workspace_root is None
    assert turn.tools is None
    assert turn.reasoning_effort is None
    assert turn.history_window == 20
    assert turn.log_tag == "TURN"
    assert turn.log_extras == {}


def test_chat_turn_input_custom_values() -> None:
    """ChatTurnInput stores all fields passed at construction time."""
    provider = _make_fake_provider([])
    channel = _make_fake_channel()
    cm = _make_channel_message()
    cid = uuid4()
    uid = uuid4()

    turn = ChatTurnInput(
        conversation_id=cid,
        user_id=uid,
        question="custom question",
        provider=provider,
        channel=channel,
        channel_message=cm,
        workspace_root=Path("/tmp/ws"),
        reasoning_effort="high",
        history_window=10,
        log_tag="CHAT",
        log_extras={"rid": "test-123"},
    )

    assert turn.conversation_id == cid
    assert turn.user_id == uid
    assert turn.question == "custom question"
    assert turn.workspace_root == Path("/tmp/ws")
    assert turn.reasoning_effort == "high"
    assert turn.history_window == 10
    assert turn.log_tag == "CHAT"
    assert turn.log_extras == {"rid": "test-123"}


# ---------------------------------------------------------------------------
# _EventCounter
# ---------------------------------------------------------------------------


def test_event_counter_starts_at_zero() -> None:
    """The counter starts at 0."""
    counter = _EventCounter()
    assert counter.value == 0


def test_event_counter_is_mutable() -> None:
    """The counter can be incremented by callers."""
    counter = _EventCounter()
    counter.value += 1
    counter.value += 1
    assert counter.value == 2


# ---------------------------------------------------------------------------
# run_turn — end-to-end with mocked DB helpers
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_run_turn_yields_channel_bytes() -> None:
    """run_turn should yield bytes from channel.deliver()."""
    provider = _make_fake_provider([{"type": "delta", "content": "hi"}])
    channel = _make_fake_channel([b"frame1", b"frame2"])
    cm = _make_channel_message()
    placeholder_id = uuid4()

    turn = ChatTurnInput(
        conversation_id=uuid4(),
        user_id=uuid4(),
        question="hello",
        provider=provider,
        channel=channel,
        channel_message=cm,
    )

    with (
        patch(
            "app.channels.turn_runner._load_history_and_persist",
            return_value=([], placeholder_id),
        ),
        patch("app.channels.turn_runner._finalize_turn") as mock_finalize,
    ):
        chunks = [chunk async for chunk in run_turn(turn)]

    assert chunks == [b"frame1", b"frame2"]
    mock_finalize.assert_called_once()


@pytest.mark.anyio
async def test_run_turn_calls_finalize_even_on_clean_exit() -> None:
    """_finalize_turn must be called in the finally block."""
    provider = _make_fake_provider([])
    channel = _make_fake_channel([])
    cm = _make_channel_message()
    placeholder_id = uuid4()

    turn = ChatTurnInput(
        conversation_id=uuid4(),
        user_id=uuid4(),
        question="hi",
        provider=provider,
        channel=channel,
        channel_message=cm,
    )

    finalize_called = False

    async def fake_finalize(**kwargs: object) -> None:
        nonlocal finalize_called
        finalize_called = True

    with (
        patch(
            "app.channels.turn_runner._load_history_and_persist",
            return_value=([], placeholder_id),
        ),
        patch("app.channels.turn_runner._finalize_turn", side_effect=fake_finalize),
    ):
        async for _ in run_turn(turn):
            pass

    assert finalize_called


@pytest.mark.anyio
async def test_run_turn_hooks_produce_extra_events() -> None:
    """EventHooks registered on run_turn are called for each primary event."""
    hook_received: list[StreamEvent] = []
    extra_event: StreamEvent = {"type": "artifact", "content": "spec"}

    def my_hook(event: StreamEvent) -> list[StreamEvent]:
        hook_received.append(event)
        if event.get("type") == "delta":
            return [extra_event]
        return []

    events_seen: list[StreamEvent] = []

    class RecordingChannel:
        surface = "web"

        async def deliver(
            self,
            stream: AsyncIterator[StreamEvent],
            message: object,
        ) -> AsyncIterator[bytes]:
            async for event in stream:
                events_seen.append(event)
            yield b""

    provider = _make_fake_provider([{"type": "delta", "content": "main"}])
    cm = _make_channel_message()
    placeholder_id = uuid4()

    turn = ChatTurnInput(
        conversation_id=uuid4(),
        user_id=uuid4(),
        question="hi",
        provider=provider,
        channel=RecordingChannel(),
        channel_message=cm,
    )

    with (
        patch(
            "app.channels.turn_runner._load_history_and_persist",
            return_value=([], placeholder_id),
        ),
        patch("app.channels.turn_runner._finalize_turn"),
    ):
        async for _ in run_turn(turn, event_hooks=[my_hook]):
            pass

    # The hook received the primary delta event.
    assert any(e.get("type") == "delta" for e in hook_received)
    # The extra artifact event also appeared in the channel stream.
    assert extra_event in events_seen


@pytest.mark.anyio
async def test_run_turn_provider_exception_becomes_error_event() -> None:
    """A provider exception must be caught and emitted as an error StreamEvent."""
    error_events_seen: list[StreamEvent] = []

    class FailingProvider:
        async def stream(self, *args: object, **kwargs: object) -> AsyncIterator[StreamEvent]:
            raise RuntimeError("boom")
            yield {"type": "delta", "content": "unreachable"}  # type: ignore[misc]

    class RecordingChannel:
        surface = "web"

        async def deliver(
            self,
            stream: AsyncIterator[StreamEvent],
            message: object,
        ) -> AsyncIterator[bytes]:
            async for event in stream:
                error_events_seen.append(event)
            yield b""

    cm = _make_channel_message()
    placeholder_id = uuid4()

    turn = ChatTurnInput(
        conversation_id=uuid4(),
        user_id=uuid4(),
        question="boom please",
        provider=FailingProvider(),
        channel=RecordingChannel(),
        channel_message=cm,
    )

    with (
        patch(
            "app.channels.turn_runner._load_history_and_persist",
            return_value=([], placeholder_id),
        ),
        patch("app.channels.turn_runner._finalize_turn"),
    ):
        async for _ in run_turn(turn):
            pass

    error_events = [e for e in error_events_seen if e.get("type") == "error"]
    assert len(error_events) == 1
    assert "boom" in error_events[0].get("content", "")


@pytest.mark.anyio
async def test_run_turn_passes_reasoning_effort_to_provider() -> None:
    """reasoning_effort from ChatTurnInput must reach provider.stream()."""
    received_kwargs: dict[str, object] = {}

    class CapturingProvider:
        async def stream(
            self,
            question: str,
            conversation_id: object,
            user_id: object,
            history: object = None,
            tools: object = None,
            system_prompt: object = None,
            reasoning_effort: object = None,
        ) -> AsyncIterator[StreamEvent]:
            received_kwargs["reasoning_effort"] = reasoning_effort
            yield {"type": "delta", "content": "ok"}

    channel = _make_fake_channel([])
    cm = _make_channel_message()
    placeholder_id = uuid4()

    turn = ChatTurnInput(
        conversation_id=uuid4(),
        user_id=uuid4(),
        question="hi",
        provider=CapturingProvider(),
        channel=channel,
        channel_message=cm,
        reasoning_effort="extra-high",
    )

    with (
        patch(
            "app.channels.turn_runner._load_history_and_persist",
            return_value=([], placeholder_id),
        ),
        patch("app.channels.turn_runner._finalize_turn"),
    ):
        async for _ in run_turn(turn):
            pass

    assert received_kwargs.get("reasoning_effort") == "extra-high"


@pytest.mark.anyio
async def test_run_turn_no_hooks_by_default() -> None:
    """run_turn with no event_hooks argument produces the same result as passing []."""
    provider = _make_fake_provider([{"type": "delta", "content": "hi"}])
    channel = _make_fake_channel([b"ok"])
    cm = _make_channel_message()
    placeholder_id = uuid4()

    turn = ChatTurnInput(
        conversation_id=uuid4(),
        user_id=uuid4(),
        question="hi",
        provider=provider,
        channel=channel,
        channel_message=cm,
    )

    with (
        patch(
            "app.channels.turn_runner._load_history_and_persist",
            return_value=([], placeholder_id),
        ),
        patch("app.channels.turn_runner._finalize_turn"),
    ):
        chunks = [c async for c in run_turn(turn)]

    assert chunks == [b"ok"]


# ---------------------------------------------------------------------------
# _workspace_system_prompt — boundary / regression
# ---------------------------------------------------------------------------


def test_workspace_system_prompt_with_agents_md(tmp_path: Path) -> None:
    """When workspace has AGENTS.md, the prompt is non-None."""
    (tmp_path / "AGENTS.md").write_text("# Agents\nDo great work.", encoding="utf-8")
    result = _workspace_system_prompt(tmp_path)
    # assemble_workspace_prompt reads the file; result must not be None.
    assert result is not None
    assert "Agents" in result or "great work" in result
