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
    """Chat stores the canonical model id on the conversation.

    The frontend (and legacy stored rows) may send the bare SDK id
    ``"gemini-3-flash-preview"``; the chat router normalises it to the
    catalog's canonical ``"<provider>/<model>"`` form before persistence so
    the database converges on a single grammar.
    """
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
    assert conversation_response.json()["model_id"] == "google/gemini-3-flash-preview"


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
