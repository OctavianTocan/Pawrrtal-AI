"""End-to-end: clicking Log Out via the user menu lands on /login."""

from __future__ import annotations

import pytest


@pytest.mark.browser_use
async def test_logout_redirects_to_login(agent_factory, base_url: str) -> None:
    """The NavUser footer menu's Log out item POSTs /auth/jwt/logout,
    clears the React Query cache, and routes to /login.
    """
    agent = agent_factory(
        f"""
Open {base_url}/.

Find the user profile button at the bottom of the left sidebar. It
shows the user's name and an avatar.

Click it to open the account dropdown menu. The menu should appear
above the profile button.

Find and click the "Log out" item near the bottom of the menu.

Wait for the navigation. The URL should change to {base_url}/login
and the login form should be visible.

Return the final URL you landed on as your final answer.
""".strip()
    )

    result = await agent.run(max_steps=15)

    assert result.is_done()
    final = (result.final_result() or "").lower()
    visited = result.urls()
    assert "/login" in final or any("/login" in url for url in visited), (
        f"Logout didn't redirect to /login. Final answer: {final!r}, URLs: {visited}"
    )
