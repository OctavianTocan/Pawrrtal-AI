"""API tests for chat streaming routes."""

from collections.abc import AsyncIterator
from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.core.agent_loop.types import AgentSafetyConfig
from app.models import Workspace  # noqa: F401  # used via fixture type hint


class FakeProvider:
    """Provider test double that yields configured stream events."""

    def __init__(self, events: list[dict[str, str]]) -> None:
        self.events = events

    async def stream(
        self,
        question: str,
        conversation_id: object,
        user_id: object,
        history: object = None,
        tools: object = None,
        system_prompt: object = None,
    ) -> AsyncIterator[dict[str, str]]:
        for event in self.events:
            yield event


@pytest.mark.anyio
async def test_chat_returns_404_for_missing_conversation(client: AsyncClient) -> None:
    """Chat requests require an existing owned conversation."""
    response = await client.post(
        "/api/v1/chat/",
        json={"question": "hello", "conversation_id": str(uuid4())},
    )

    assert response.status_code == 404


@pytest.mark.anyio
async def test_chat_returns_412_when_user_has_no_workspace(
    client: AsyncClient,
) -> None:
    """Chat refuses to run before onboarding is complete.

    No ``seeded_default_workspace`` fixture here — the user hasn't been
    onboarded yet, so the API must return 412 Precondition Failed rather
    than silently running with degraded tools.
    """
    conversation_id = uuid4()
    await client.post(
        f"/api/v1/conversations/{conversation_id}", json={"title": "NoWS"}
    )

    response = await client.post(
        "/api/v1/chat/",
        json={"question": "hello", "conversation_id": str(conversation_id)},
    )

    assert response.status_code == 412
    assert "onboarding" in response.json()["detail"].lower()


@pytest.mark.anyio
async def test_chat_streams_provider_events(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    seeded_default_workspace: Workspace,
) -> None:
    """Chat streams provider events as SSE frames and terminates with DONE."""
    conversation_id = uuid4()
    await client.post(
        f"/api/v1/conversations/{conversation_id}", json={"title": "Chat"}
    )
    monkeypatch.setattr(
        "app.api.chat.resolve_llm",
        lambda _model_id: FakeProvider([{"type": "delta", "content": "hello"}]),
    )

    response = await client.post(
        "/api/v1/chat/",
        json={"question": "hello", "conversation_id": str(conversation_id)},
    )

    assert response.status_code == 200
    assert 'data: {"type": "delta", "content": "hello"}' in response.text
    assert "data: [DONE]" in response.text


@pytest.mark.anyio
async def test_chat_persists_requested_model_id(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    seeded_default_workspace: Workspace,
) -> None:
    """Chat stores the requested model on the conversation."""
    conversation_id = uuid4()
    await client.post(
        f"/api/v1/conversations/{conversation_id}", json={"title": "Model"}
    )
    monkeypatch.setattr(
        "app.api.chat.resolve_llm",
        lambda _model_id: FakeProvider([{"type": "delta", "content": "ok"}]),
    )

    response = await client.post(
        "/api/v1/chat/",
        json={
            "question": "hello",
            "conversation_id": str(conversation_id),
            "model_id": "gemini-3-flash-preview",
        },
    )
    conversation_response = await client.get(f"/api/v1/conversations/{conversation_id}")

    assert response.status_code == 200
    assert conversation_response.json()["model_id"] == "gemini-3-flash-preview"


@pytest.mark.anyio
async def test_chat_stream_converts_provider_exception_to_error_event(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    seeded_default_workspace: Workspace,
) -> None:
    """Provider exceptions are emitted as stream-level error events."""
    conversation_id = uuid4()
    await client.post(
        f"/api/v1/conversations/{conversation_id}", json={"title": "Error"}
    )

    class FailingProvider:
        async def stream(
            self,
            question: str,
            conversation_id: object,
            user_id: object,
            history: object = None,
            tools: object = None,
            system_prompt: object = None,
        ) -> AsyncIterator[dict[str, str]]:
            raise RuntimeError("provider failed")
            yield {"type": "delta", "content": "unreachable"}

    monkeypatch.setattr("app.api.chat.resolve_llm", lambda _model_id: FailingProvider())

    response = await client.post(
        "/api/v1/chat/",
        json={"question": "hello", "conversation_id": str(conversation_id)},
    )

    assert response.status_code == 200
    assert '"type": "error"' in response.text
    assert "provider failed" in response.text
    assert "data: [DONE]" in response.text


@pytest.mark.anyio
async def test_chat_safety_layer_fires_and_surfaces_agent_terminated(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    seeded_default_workspace: Workspace,
) -> None:
    """The agent safety layer is wired into the real HTTP path end-to-end.

    This test exercises the full chain:

        POST /api/v1/chat/
          → chat.py calls resolve_llm() → GeminiLLM.stream()
          → safety_from_settings() is called and builds an AgentSafetyConfig
          → agent_loop() receives the config and fires an AgentTerminatedEvent
            when max_iterations=0 (trips on the very first pre-turn check)
          → GeminiLLM translates the event to StreamEvent(type="agent_terminated")
          → chat.py forwards it as an SSE frame

    ``safety_from_settings`` is patched to return ``max_iterations=0`` so
    the safety trips without any real LLM call.  ``_stream_fn`` is replaced
    with an async generator that asserts it is never invoked — proving the
    safety fired before the provider was contacted.

    If the safety layer were disconnected, ``_stream_fn`` would be reached
    (raising ``AssertionError``) and no ``agent_terminated`` frame would
    appear in the response.
    """
    from app.core.providers.gemini_provider import GeminiLLM

    # Build a GeminiLLM that routes through agent_loop (the real production
    # path) with a stream_fn that must never be called.  max_iterations=0
    # means the safety fires before the first LLM call.
    provider = GeminiLLM("gemini-test")

    async def _must_not_be_called(messages, tools):  # type: ignore[override]
        raise AssertionError(
            "stream_fn was called but should not have been: safety did not fire."
        )
        yield  # make the function an async generator

    monkeypatch.setattr(provider, "_stream_fn", _must_not_be_called)

    # Override safety_from_settings to return max_iterations=0 so the loop
    # trips immediately.  This is the config that settings → provider →
    # agent_loop reads on every real chat request.
    monkeypatch.setattr(
        "app.core.providers.gemini_provider.safety_from_settings",
        lambda _settings: AgentSafetyConfig(
            max_iterations=0,
            max_wall_clock_seconds=None,
            max_consecutive_llm_errors=None,
            max_consecutive_tool_errors=None,
        ),
    )

    monkeypatch.setattr("app.api.chat.resolve_llm", lambda _model_id: provider)

    conversation_id = uuid4()
    await client.post(
        f"/api/v1/conversations/{conversation_id}", json={"title": "Safety Test"}
    )

    response = await client.post(
        "/api/v1/chat/",
        json={"question": "hello", "conversation_id": str(conversation_id)},
    )

    assert response.status_code == 200
    # The SSE stream must contain an agent_terminated frame.
    assert '"type": "agent_terminated"' in response.text
    # The message should describe why the agent stopped.
    assert "max_iterations" in response.text
    # The stream must still close cleanly.
    assert "data: [DONE]" in response.text
