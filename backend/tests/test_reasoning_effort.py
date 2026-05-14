"""Tests for the reasoning-effort wire (request → chat router → provider).

The frontend used to surface a 4-step reasoning slider that persisted to
localStorage but never crossed the wire — a placebo control.  These
tests pin the new contract: the value reaches the provider on
thinking-capable models, and is silently dropped on models without
extended thinking.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.models import Workspace  # used via fixture type hint


class CapturingProvider:
    """Provider double that records the kwargs it was streamed with."""

    def __init__(self) -> None:
        self.captured: dict[str, object] = {}

    async def stream(
        self,
        question: str,
        conversation_id: object,
        user_id: object,
        history: object = None,
        tools: object = None,
        system_prompt: object = None,
        reasoning_effort: object = None,
    ) -> AsyncIterator[dict[str, str]]:
        self.captured = {
            "reasoning_effort": reasoning_effort,
            "system_prompt_chars": len(system_prompt or "")
            if isinstance(system_prompt, str)
            else 0,
        }
        yield {"type": "delta", "content": "ok"}


@pytest.mark.anyio
async def test_reasoning_effort_reaches_provider_on_thinking_capable_model(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    seeded_default_workspace: Workspace,
) -> None:
    """A request with ``reasoning_effort`` hits a Claude (thinking-capable)
    provider with the same value."""
    conversation_id = uuid4()
    await client.post(f"/api/v1/conversations/{conversation_id}", json={"title": "Thinking"})

    provider = CapturingProvider()
    monkeypatch.setattr("app.api.chat.resolve_llm", lambda _model_id: provider)

    response = await client.post(
        "/api/v1/chat/",
        json={
            "question": "hello",
            "conversation_id": str(conversation_id),
            "model_id": "anthropic/claude-sonnet-4-6",
            "reasoning_effort": "high",
        },
    )

    assert response.status_code == 200
    assert provider.captured["reasoning_effort"] == "high"


@pytest.mark.anyio
async def test_reasoning_effort_dropped_on_non_thinking_model(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    seeded_default_workspace: Workspace,
) -> None:
    """Gemini Flash has no extended thinking — the request value is
    silently dropped before reaching the provider so the Gemini path
    never receives a thinking budget it cannot honour."""
    conversation_id = uuid4()
    await client.post(f"/api/v1/conversations/{conversation_id}", json={"title": "Gemini"})

    provider = CapturingProvider()
    monkeypatch.setattr("app.api.chat.resolve_llm", lambda _model_id: provider)

    response = await client.post(
        "/api/v1/chat/",
        json={
            "question": "hello",
            "conversation_id": str(conversation_id),
            "model_id": "google/gemini-3-flash-preview",
            "reasoning_effort": "high",
        },
    )

    assert response.status_code == 200
    assert provider.captured["reasoning_effort"] is None


@pytest.mark.anyio
async def test_reasoning_effort_omitted_when_request_omits_it(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    seeded_default_workspace: Workspace,
) -> None:
    """Omitting ``reasoning_effort`` lets the provider's adaptive
    default apply — the router does not synthesise one."""
    conversation_id = uuid4()
    await client.post(f"/api/v1/conversations/{conversation_id}", json={"title": "Adaptive"})

    provider = CapturingProvider()
    monkeypatch.setattr("app.api.chat.resolve_llm", lambda _model_id: provider)

    response = await client.post(
        "/api/v1/chat/",
        json={
            "question": "hello",
            "conversation_id": str(conversation_id),
            "model_id": "anthropic/claude-sonnet-4-6",
        },
    )

    assert response.status_code == 200
    assert provider.captured["reasoning_effort"] is None
