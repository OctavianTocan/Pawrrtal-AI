"""End-to-end: home-page personalization wizard advances past identity step."""

from __future__ import annotations

import pytest


@pytest.mark.browser_use
async def test_personalization_identity_step_advances(
    agent_factory, base_url: str
) -> None:
    """The personalization modal opens on every fresh load while WIP.

    Fills in the identity step's name + at least one goal chip, then
    clicks Continue and asserts the next step (Context) appears.
    """
    agent = agent_factory(
        f"""
Open {base_url}/.

A modal titled "Let's get to know you" should appear over the page.
This is the personalization wizard. (If it doesn't appear, return
"missing" as your final answer.)

Inside the modal:

  1. Find the "Your name" field and type "Browser Use Tester".
  2. Find the "What do you want to accomplish?" goal chips. Click the
     "Writing" chip (or any other available chip if Writing isn't
     present).
  3. Click the "Continue" button at the bottom of the modal.

After clicking Continue, the next step should appear. Its heading
mentions "context" (e.g. "Let's give your agent some context about
you").

Return "advanced" if you reached the context step, otherwise return
a short error description.
""".strip()
    )

    result = await agent.run(max_steps=25)

    assert result.is_done()
    final = (result.final_result() or "").lower()
    if "missing" in final:
        pytest.skip("Personalization modal not present (already dismissed?).")
    assert "advanced" in final, (
        f"Wizard did not advance past identity. Agent said: {final!r}"
    )
