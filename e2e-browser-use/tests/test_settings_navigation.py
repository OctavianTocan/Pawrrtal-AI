"""End-to-end: every settings nav rail row renders its expected heading."""

from __future__ import annotations

import pytest


@pytest.mark.browser_use
async def test_settings_nav_each_tab_has_a_heading(agent_factory, base_url: str) -> None:
    """Walk the rail from General to Usage and report each page's h1."""
    agent = agent_factory(
        f"""
Open {base_url}/settings.

The page has a left navigation rail. Click each of the following items
in order, waiting for the right pane to settle after each click. Note
the page heading (h1) that appears in the right pane after each click:

  1. General
  2. Appearance
  3. Personalization
  4. Integrations
  5. Archived chats
  6. Usage

Return your final answer as a comma-separated list of the headings
you observed, in the same order.
""".strip()
    )

    result = await agent.run(max_steps=40)

    assert result.is_done()
    assert result.is_successful() is not False, (
        f"Agent reported failure. Errors: {result.errors()}"
    )
    final = (result.final_result() or "").lower()
    expected = ["general", "appearance", "personalization", "archived chats", "usage"]
    missing = [name for name in expected if name not in final]
    assert not missing, (
        f"Settings tabs missing headings: {missing}. Agent said: {final!r}"
    )
