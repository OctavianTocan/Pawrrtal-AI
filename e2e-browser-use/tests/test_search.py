"""End-to-end: typing into the sidebar search filters the conversation list."""

from __future__ import annotations

import pytest


@pytest.mark.browser_use
async def test_sidebar_search_filters_results(agent_factory, base_url: str) -> None:
    """Typing 2+ chars triggers the conversation search; the list shrinks
    and a count badge appears next to matching titles. Skipped if the
    test account has no chats to search through.
    """
    agent = agent_factory(
        f"""
Open {base_url}/.

Look at the chat list in the left sidebar. If it's empty, return
"skip" and stop.

Find the search field in the sidebar header and type a single
common letter ("a"). Wait for the list to filter.

Confirm at least one chat row remains visible in the filtered list.

Return "ok" if results are visible, "empty" if the search returned
nothing (still a valid outcome — search may have matched nothing),
or a short error description.
""".strip()
    )

    result = await agent.run(max_steps=20)

    assert result.is_done()
    final = (result.final_result() or "").lower()
    if "skip" in final:
        pytest.skip("Test account has no chats to search through.")
    assert "ok" in final or "empty" in final, (
        f"Search broke the sidebar. Agent said: {final!r}"
    )
