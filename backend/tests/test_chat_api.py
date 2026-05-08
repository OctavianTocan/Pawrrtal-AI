"""API tests for chat streaming routes."""

from collections.abc import AsyncIterator
from uuid import uuid4

import pytest
from httpx import AsyncClient


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
    ) -> AsyncIterator[dict[str, str]]:
        # ``history`` was added to the provider contract when chat.py started
        # threading prior turns through; tests don't assert on it but must
        # accept it so the keyword-call from chat.py doesn't blow up.
        del history
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
async def test_chat_streams_provider_events(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
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
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
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
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
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
        ) -> AsyncIterator[dict[str, str]]:
            del history  # accept-and-ignore, see FakeProvider above
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
