"""API tests for chat streaming routes."""

from collections.abc import AsyncIterator
from uuid import uuid4

import pytest
from httpx import AsyncClient

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
@pytest.mark.anyio
async def test_chat_filters_write_tools_under_default_permission_mode(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    seeded_default_workspace: Workspace,
) -> None:
    """Default mode (Ask to Edit) must hide write tools from the model.

    The chat router builds the workspace tools, then filters them by
    permission mode before passing them to the provider.  Capture what
    the provider received and assert ``write_file`` isn't in it.
    """
    conversation_id = uuid4()
    await client.post(
        f"/api/v1/conversations/{conversation_id}", json={"title": "Perms"}
    )

    captured_tools: list[object] = []
    captured_system_prompt: list[object] = []

    class CapturingProvider:
        async def stream(
            self,
            question: str,
            conversation_id: object,
            user_id: object,
            history: object = None,
            tools: object = None,
            system_prompt: object = None,
        ) -> AsyncIterator[dict[str, str]]:
            captured_tools.append(tools)
            captured_system_prompt.append(system_prompt)
            yield {"type": "delta", "content": "ok"}

    monkeypatch.setattr(
        "app.api.chat.resolve_llm", lambda _model_id: CapturingProvider()
    )

    response = await client.post(
        "/api/v1/chat/",
        json={
            "question": "hi",
            "conversation_id": str(conversation_id),
            # Explicit default; would also be the fallback when omitted.
            "permission_mode": "default-permissions",
        },
    )

    assert response.status_code == 200
    assert captured_tools, "provider.stream was never called"
    tools = captured_tools[0]
    assert tools is not None
    tool_names = {t.name for t in tools}
    assert "read_file" in tool_names
    assert "list_dir" in tool_names
    # The bug we're guarding: write_file must not be visible to the model.
    assert "write_file" not in tool_names
    # The Ask-to-Edit addendum should be appended to the system prompt.
    assert captured_system_prompt[0] is not None
    assert "ASK-TO-EDIT" in captured_system_prompt[0]


@pytest.mark.anyio
async def test_chat_passes_all_tools_under_full_access(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    seeded_default_workspace: Workspace,
) -> None:
    """Full access mode must expose every workspace tool."""
    conversation_id = uuid4()
    await client.post(
        f"/api/v1/conversations/{conversation_id}", json={"title": "Full"}
    )

    captured_tools: list[object] = []

    class CapturingProvider:
        async def stream(
            self,
            question: str,
            conversation_id: object,
            user_id: object,
            history: object = None,
            tools: object = None,
            system_prompt: object = None,
        ) -> AsyncIterator[dict[str, str]]:
            captured_tools.append(tools)
            yield {"type": "delta", "content": "ok"}

    monkeypatch.setattr(
        "app.api.chat.resolve_llm", lambda _model_id: CapturingProvider()
    )

    response = await client.post(
        "/api/v1/chat/",
        json={
            "question": "hi",
            "conversation_id": str(conversation_id),
            "permission_mode": "full-access",
        },
    )

    assert response.status_code == 200
    tool_names = {t.name for t in captured_tools[0]}
    assert {"read_file", "write_file", "list_dir"} <= tool_names


@pytest.mark.anyio
async def test_chat_falls_back_to_safe_default_on_unknown_permission_mode(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    seeded_default_workspace: Workspace,
) -> None:
    """Unknown mode strings must NOT escalate to full access — fail closed."""
    conversation_id = uuid4()
    await client.post(
        f"/api/v1/conversations/{conversation_id}", json={"title": "Bad"}
    )

    captured_tools: list[object] = []

    class CapturingProvider:
        async def stream(
            self,
            question: str,
            conversation_id: object,
            user_id: object,
            history: object = None,
            tools: object = None,
            system_prompt: object = None,
        ) -> AsyncIterator[dict[str, str]]:
            captured_tools.append(tools)
            yield {"type": "delta", "content": "ok"}

    monkeypatch.setattr(
        "app.api.chat.resolve_llm", lambda _model_id: CapturingProvider()
    )

    response = await client.post(
        "/api/v1/chat/",
        json={
            "question": "hi",
            "conversation_id": str(conversation_id),
            "permission_mode": "god-mode-please",
        },
    )

    assert response.status_code == 200
    tool_names = {t.name for t in captured_tools[0]}
    # write_file must remain hidden under the fallback (Ask-to-Edit).
    assert "write_file" not in tool_names


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
