"""Unit tests for the ``render_artifact`` tool + chat-router helper.

Covers the pure-Python wire-shape validator (:func:`build_artifact`),
the LLM-facing tool wrapper (:func:`make_artifact_tool`), and the
chat-router helper that emits the sibling ``artifact`` SSE event
(``_maybe_artifact_event``).  The helper is the load-bearing seam: it is
what turns a ``tool_use`` from the model into the structured event the
frontend renders, so its negative paths matter as much as the positive
one.
"""

from __future__ import annotations

import asyncio

import pytest

from app.core.providers.base import StreamEvent
from app.core.tools.artifact import (
    ArtifactValidationError,
    build_artifact,
    llm_summary_for,
)
from app.core.tools.artifact_agent import (
    ARTIFACT_TOOL_NAME,
    make_artifact_tool,
)


_VALID_SPEC = {
    "root": "page",
    "elements": {
        "page": {
            "type": "Page",
            "props": {"title": "demo", "accent": "cat"},
            "children": ["heading"],
        },
        "heading": {
            "type": "Heading",
            "props": {"text": "Hello"},
            "children": [],
        },
    },
}


# ---------------------------------------------------------------------------
# build_artifact — wire-shape validation
# ---------------------------------------------------------------------------


def test_build_artifact_returns_payload_with_minted_id() -> None:
    payload = build_artifact(title="Demo", spec=_VALID_SPEC)

    assert payload["title"] == "Demo"
    assert payload["spec"] is _VALID_SPEC
    assert payload["id"].startswith("art_")
    # The id is uuid4 hex truncated to 12 chars; the prefix shouldn't bleed in.
    assert len(payload["id"]) == 4 + 12  # "art_" + 12 hex chars


def test_build_artifact_rejects_blank_title() -> None:
    with pytest.raises(ArtifactValidationError, match="title"):
        build_artifact(title="   ", spec=_VALID_SPEC)


def test_build_artifact_rejects_overlong_title() -> None:
    with pytest.raises(ArtifactValidationError, match=r"≤200"):
        build_artifact(title="x" * 201, spec=_VALID_SPEC)


def test_build_artifact_rejects_missing_root() -> None:
    bad = {"elements": _VALID_SPEC["elements"]}
    with pytest.raises(ArtifactValidationError, match="root"):
        build_artifact(title="Demo", spec=bad)


def test_build_artifact_rejects_root_pointing_outside_elements() -> None:
    bad = {"root": "ghost", "elements": _VALID_SPEC["elements"]}
    with pytest.raises(ArtifactValidationError, match="not present"):
        build_artifact(title="Demo", spec=bad)


def test_build_artifact_rejects_non_string_children() -> None:
    bad = {
        "root": "page",
        "elements": {
            "page": {
                "type": "Page",
                "props": {},
                "children": [{"not": "a string"}],
            }
        },
    }
    with pytest.raises(ArtifactValidationError, match="children"):
        build_artifact(title="Demo", spec=bad)


# ---------------------------------------------------------------------------
# llm_summary_for — what the model sees back
# ---------------------------------------------------------------------------


def test_llm_summary_does_not_echo_spec_back_to_model() -> None:
    payload = build_artifact(title="My title", spec=_VALID_SPEC)
    summary = llm_summary_for(payload)

    assert payload["id"] in summary
    assert payload["title"] in summary
    # The summary is the on-ramp to the LLM's next turn; including the
    # spec here would inflate context for no benefit.
    assert "Heading" not in summary
    assert "elements" not in summary


# ---------------------------------------------------------------------------
# AgentTool wrapper
# ---------------------------------------------------------------------------


def test_agent_tool_metadata() -> None:
    tool = make_artifact_tool()
    assert tool.name == ARTIFACT_TOOL_NAME
    assert "title" in tool.parameters["required"]
    assert "spec" in tool.parameters["required"]
    assert "preview card" in tool.description.lower()


def test_agent_tool_execute_returns_summary_on_valid_call() -> None:
    tool = make_artifact_tool()
    result = asyncio.run(
        tool.execute(tool_call_id="t1", title="Demo", spec=_VALID_SPEC)
    )
    assert result.startswith("Artifact rendered")
    assert "art_" in result


def test_agent_tool_execute_returns_corrective_string_on_bad_spec() -> None:
    tool = make_artifact_tool()
    result = asyncio.run(
        tool.execute(tool_call_id="t1", title="Demo", spec="not a dict")
    )
    # Should be human-readable so the LLM can self-correct, not raise.
    assert "Error" in result
    assert "render_artifact again" in result


# ---------------------------------------------------------------------------
# Chat-router helper
# ---------------------------------------------------------------------------


def test_maybe_artifact_event_emits_for_render_artifact_tool_use() -> None:
    from app.api.chat import _maybe_artifact_event

    event: StreamEvent = {
        "type": "tool_use",
        "tool_use_id": "tu_42",
        "name": ARTIFACT_TOOL_NAME,
        "input": {"title": "Hello", "spec": _VALID_SPEC},
    }

    out = _maybe_artifact_event(event)
    assert out is not None
    assert out["type"] == "artifact"
    artifact = out["artifact"]
    assert artifact["title"] == "Hello"
    assert artifact["spec"] == _VALID_SPEC
    assert artifact["id"].startswith("art_")
    assert artifact["tool_use_id"] == "tu_42"


def test_maybe_artifact_event_returns_none_for_other_tools() -> None:
    from app.api.chat import _maybe_artifact_event

    event: StreamEvent = {
        "type": "tool_use",
        "tool_use_id": "tu_1",
        "name": "exa_search",
        "input": {"query": "anything"},
    }
    assert _maybe_artifact_event(event) is None


def test_maybe_artifact_event_returns_none_for_invalid_spec() -> None:
    from app.api.chat import _maybe_artifact_event

    event: StreamEvent = {
        "type": "tool_use",
        "tool_use_id": "tu_1",
        "name": ARTIFACT_TOOL_NAME,
        "input": {"title": "", "spec": _VALID_SPEC},
    }
    # Bad title — silent None so the agent's own retry loop kicks in via
    # the tool's error string, instead of half-emitting a broken event.
    assert _maybe_artifact_event(event) is None


def test_maybe_artifact_event_returns_none_for_non_tool_events() -> None:
    from app.api.chat import _maybe_artifact_event

    delta: StreamEvent = {"type": "delta", "content": "hello"}
    assert _maybe_artifact_event(delta) is None
