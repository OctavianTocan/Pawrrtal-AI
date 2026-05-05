"""End-to-end: archive a chat from the sidebar, unarchive it from settings."""

from __future__ import annotations

import pytest


@pytest.mark.browser_use
async def test_archive_then_unarchive_roundtrip(agent_factory, base_url: str) -> None:
    """Verifies the Settings → Archived chats page lists archived rows
    and the Unarchive button works end-to-end through the existing
    PATCH /conversations mutation.

    Skipped gracefully if the test account has no chats — we're not
    seeding fixture data; the suite assumes the dev admin has at
    least one chat from prior use.
    """
    agent = agent_factory(
        f"""
Open {base_url}/.

Look at the chat list in the left sidebar. If it's empty, return the
single word "skip" as your final answer and stop.

Otherwise:

  1. Right-click the first chat row to open the context menu.
  2. Click "Archive".
  3. Wait for a toast confirming the archive.
  4. Navigate to {base_url}/settings.
  5. Click "Archived chats" in the left rail.
  6. The right pane should show a list of archived chats with an
     Unarchive button on each row.
  7. Click the Unarchive button on the topmost row.
  8. Wait for the confirmation toast.

Return "ok" if all steps succeeded, otherwise return a short error
description.
""".strip()
    )

    result = await agent.run(max_steps=40)

    assert result.is_done()
    final = (result.final_result() or "").lower()
    if "skip" in final:
        pytest.skip("Test account has no chats to archive.")
    assert "ok" in final, f"Archive roundtrip failed: {final!r}"
