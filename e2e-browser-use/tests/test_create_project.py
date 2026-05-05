"""End-to-end: creating a project via the sidebar create modal."""

from __future__ import annotations

import pytest


@pytest.mark.browser_use
async def test_create_project_via_sidebar_modal(agent_factory, base_url: str) -> None:
    """The Projects section header has a + button that opens a name modal.

    Verifies the redesigned create flow (no auto "New Project" naming):
    the modal asks for a name, and submitting it adds a row to the
    Projects list.
    """
    project_name = "Browser-Use Demo"
    agent = agent_factory(
        f"""
Open {base_url}/ and look at the left sidebar.

Find the "Projects" section header. Hover over it to reveal the
"Create new project" button (a small + icon next to the header).

Click the button. A modal should open titled "Create project" with a
text field labelled "Project name".

Type "{project_name}" into that field and click the "Create project"
button.

Wait for the modal to close, then look at the Projects list in the
sidebar. Confirm a row named "{project_name}" now appears in it.

Report "yes" or "no" depending on whether the new project row is
visible in the sidebar.
""".strip()
    )

    result = await agent.run(max_steps=20)

    assert result.is_done()
    assert result.is_successful() is not False, (
        f"Agent reported failure. Errors: {result.errors()}"
    )
    final = (result.final_result() or "").lower()
    assert "yes" in final, (
        f"Expected the project to appear in the sidebar; agent said: {final!r}"
    )
