"""End-to-end: a brand-new chat streams a non-empty assistant response."""

from __future__ import annotations

import pytest


@pytest.mark.browser_use
async def test_sending_a_message_streams_an_assistant_response(
    agent_factory, base_url: str
) -> None:
    """The home page lets an authenticated user send a message and see a reply.

    We instruct the agent to land on the home composer, type a short
    message, send it, and report whether the assistant replied. The
    assertion is on the agent's final answer (the language model is
    cheaper to ask "did you see a reply" than to scrape the DOM
    ourselves), with a URL containment check as the cheap structural
    backup.
    """
    agent = agent_factory(
        f"""
Open {base_url}/ (the AI Nexus home page).

Find the chat composer at the bottom of the screen and type
"Reply with the single word 'pong' and nothing else.".

Submit the message (press Enter, or click the send button).

Wait for the assistant to finish replying. Then return the assistant's
reply text verbatim as your final answer.
""".strip()
    )

    result = await agent.run(max_steps=20)

    assert result.is_done(), "Agent never reached the done state."
    assert result.is_successful() is not False, (
        f"Agent reported failure. Errors: {result.errors()}"
    )
    final = (result.final_result() or "").lower()
    assert "pong" in final or len(final) > 0, (
        f"Expected the assistant's reply in the final answer; got: {final!r}"
    )
    assert any(base_url in url or url.startswith(base_url) for url in result.urls()), (
        f"Agent never visited the app. URLs: {result.urls()}"
    )
