"""Tests for the centralized agent-tool composer.

Covers `app.core.agent_tools.build_agent_tools` — the single source of
truth for which tools the agent has access to per turn.  The chat
router used to inline this composition; moving it here gave us
something testable in isolation (no FastAPI request cycle, no mock
provider) and a natural home for future per-agent / per-user
permission gating.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from app.core.agent_tools import build_agent_tools


def test_build_agent_tools_always_includes_workspace_tools(tmp_path: Path) -> None:
    """Workspace tools are the agent's default operating surface — always present."""
    tools = build_agent_tools(workspace_root=tmp_path)
    names = [t.name for t in tools]
    # The exact set comes from `make_workspace_tools`; just assert the
    # baseline read/write/list are there so a future drop in that
    # factory shows up here.
    assert "read_file" in names
    assert "write_file" in names
    assert "list_dir" in names


def test_build_agent_tools_includes_exa_when_api_key_set(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Web search is capability-gated on the EXA_API_KEY setting."""
    monkeypatch.setattr("app.core.agent_tools.settings.exa_api_key", "test-key")
    tools = build_agent_tools(workspace_root=tmp_path)
    assert "exa_search" in [t.name for t in tools]


def test_build_agent_tools_excludes_exa_when_api_key_absent(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Empty/absent EXA_API_KEY means the agent doesn't see the web-search tool.

    This is the right shape — the alternative (always declare the tool
    and have it error at runtime when called) would mean Claude/Gemini
    pick the tool, fail, and waste a turn.
    """
    monkeypatch.setattr("app.core.agent_tools.settings.exa_api_key", "")
    tools = build_agent_tools(workspace_root=tmp_path)
    assert "exa_search" not in [t.name for t in tools]


def test_build_agent_tools_returns_workspace_tools_first(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Stable order: workspace tools first, capability-gated tools after.

    The Claude bridge constructs the `allowed_tools` whitelist from
    this list in order; snapshot-style tests rely on a stable
    ordering, and \"file ops first, web second\" is the human-natural
    reading.
    """
    monkeypatch.setattr("app.core.agent_tools.settings.exa_api_key", "test-key")
    tools = build_agent_tools(workspace_root=tmp_path)
    names = [t.name for t in tools]
    # Workspace tools all appear before exa_search.
    workspace_names = {"read_file", "write_file", "list_dir"}
    exa_index = names.index("exa_search")
    for name in workspace_names:
        assert names.index(name) < exa_index, (
            f"workspace tool {name!r} should come before exa_search"
        )
