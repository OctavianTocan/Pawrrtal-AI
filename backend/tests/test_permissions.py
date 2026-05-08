"""Tests for the provider-agnostic tool permission system."""

from __future__ import annotations

import pytest

from app.core.agent_loop.types import AgentTool
from app.core.permissions import (
    DEFAULT_PERMISSION_MODE,
    PermissionMode,
    ToolCategory,
    allowed_categories,
    evaluate,
    filter_tools_for_mode,
    system_prompt_addendum,
)


# ---------------------------------------------------------------------------
# Mode lookup table
# ---------------------------------------------------------------------------


def test_default_mode_is_ask_to_edit() -> None:
    """New users land on Ask-to-Edit, not Full Access."""
    assert DEFAULT_PERMISSION_MODE == PermissionMode.ASK_TO_EDIT


@pytest.mark.parametrize(
    ("mode", "expected"),
    [
        (PermissionMode.PLAN, frozenset({ToolCategory.READ})),
        (PermissionMode.ASK_TO_EDIT, frozenset({ToolCategory.READ})),
        (
            PermissionMode.AUTO_REVIEW,
            frozenset({ToolCategory.READ, ToolCategory.WRITE, ToolCategory.EXEC}),
        ),
        (
            PermissionMode.FULL_ACCESS,
            frozenset({ToolCategory.READ, ToolCategory.WRITE, ToolCategory.EXEC}),
        ),
        (PermissionMode.CUSTOM, frozenset({ToolCategory.READ})),
    ],
)
def test_allowed_categories_matches_table(
    mode: PermissionMode, expected: frozenset[ToolCategory]
) -> None:
    assert allowed_categories(mode) == expected


# ---------------------------------------------------------------------------
# Runtime gate
# ---------------------------------------------------------------------------


def test_evaluate_allows_read_under_plan() -> None:
    decision = evaluate(ToolCategory.READ, PermissionMode.PLAN)
    assert decision.allow is True


def test_evaluate_denies_write_under_plan_with_recovery_hint() -> None:
    decision = evaluate(ToolCategory.WRITE, PermissionMode.PLAN)
    assert decision.allow is False
    # The reason text drives what the agent says to the user — assert the
    # recovery hint is there so we don't regress to a bare "forbidden".
    assert "Plan mode" in decision.reason
    assert "Full Access" in decision.reason


def test_evaluate_denies_write_under_default_with_recovery_hint() -> None:
    decision = evaluate(ToolCategory.WRITE, PermissionMode.ASK_TO_EDIT)
    assert decision.allow is False
    assert "Ask-to-Edit" in decision.reason
    assert "Full Access" in decision.reason


def test_evaluate_allows_everything_under_full_access() -> None:
    for category in ToolCategory:
        assert evaluate(category, PermissionMode.FULL_ACCESS).allow is True


def test_evaluate_treats_auto_review_as_full_for_now() -> None:
    """Auto-review isn't implemented yet — for now it must not block."""
    for category in ToolCategory:
        assert evaluate(category, PermissionMode.AUTO_REVIEW).allow is True


# ---------------------------------------------------------------------------
# Tool filtering (primary mechanism — model never sees forbidden tools)
# ---------------------------------------------------------------------------


def _stub_tool(name: str, category: ToolCategory) -> AgentTool:
    async def execute(tool_call_id: str, **_: object) -> str:  # noqa: ARG001
        return ""

    return AgentTool(
        name=name,
        description=name,
        parameters={"type": "object", "properties": {}, "required": []},
        execute=execute,
        category=category.value,
    )


def test_filter_drops_write_tools_under_plan() -> None:
    tools = [
        _stub_tool("read_file", ToolCategory.READ),
        _stub_tool("write_file", ToolCategory.WRITE),
        _stub_tool("list_dir", ToolCategory.READ),
    ]
    visible = filter_tools_for_mode(tools, PermissionMode.PLAN)
    assert [t.name for t in visible] == ["read_file", "list_dir"]


def test_filter_keeps_all_under_full_access() -> None:
    tools = [
        _stub_tool("read_file", ToolCategory.READ),
        _stub_tool("write_file", ToolCategory.WRITE),
        _stub_tool("run_bash", ToolCategory.EXEC),
    ]
    visible = filter_tools_for_mode(tools, PermissionMode.FULL_ACCESS)
    assert {t.name for t in visible} == {"read_file", "write_file", "run_bash"}


def test_filter_treats_untagged_tool_as_write() -> None:
    """A tool author who forgets to set ``category`` defaults to WRITE,
    so the most restrictive modes hide it.  Fail-closed."""

    async def execute(tool_call_id: str, **_: object) -> str:  # noqa: ARG001
        return ""

    untagged = AgentTool(
        name="untagged",
        description="?",
        parameters={"type": "object", "properties": {}, "required": []},
        execute=execute,
        # category default is "write"
    )
    visible = filter_tools_for_mode([untagged], PermissionMode.PLAN)
    assert visible == []


# ---------------------------------------------------------------------------
# System prompt addendum
# ---------------------------------------------------------------------------


def test_plan_mode_emits_planning_addendum() -> None:
    text = system_prompt_addendum(PermissionMode.PLAN)
    assert "PLAN mode" in text
    # The addendum should explicitly tell the agent NOT to execute.
    assert "Do not call" in text


def test_default_mode_emits_ask_to_edit_addendum() -> None:
    text = system_prompt_addendum(PermissionMode.ASK_TO_EDIT)
    assert "ASK-TO-EDIT" in text


def test_full_access_has_no_addendum() -> None:
    assert system_prompt_addendum(PermissionMode.FULL_ACCESS) == ""


def test_auto_review_has_no_addendum_for_now() -> None:
    """When auto-review lands properly it'll have its own addendum;
    while it's a stand-in for full access, no extra prompt."""
    assert system_prompt_addendum(PermissionMode.AUTO_REVIEW) == ""
