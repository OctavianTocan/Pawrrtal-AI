"""Tests for the gpt-image-2 / Codex OAuth image-generation tool.

Covers:
  - ``app.core.tools.image_gen.resolve_codex_oauth_token``
  - ``app.core.tools.image_gen_agent.make_image_gen_tool``
  - ``app.core.agent_tools.build_agent_tools`` image tool registration

All tests are unit-level — no real HTTP calls are made.
"""

from __future__ import annotations

import base64
import json
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.tools.image_gen import resolve_codex_oauth_token
from app.core.tools.image_gen_agent import make_image_gen_tool


# ---------------------------------------------------------------------------
# resolve_codex_oauth_token
# ---------------------------------------------------------------------------


def test_resolve_codex_oauth_token_uses_override() -> None:
    """An explicit override is returned as-is without touching the filesystem."""
    token = resolve_codex_oauth_token(override="my-explicit-token")
    assert token == "my-explicit-token"


def test_resolve_codex_oauth_token_reads_auth_json(tmp_path: Path) -> None:
    """Token is read from $CODEX_HOME/auth.json when no override is given."""
    auth_data = {
        "auth_mode": "chatgpt",
        "tokens": {"access_token": "token-from-file"},
    }
    auth_file = tmp_path / "auth.json"
    auth_file.write_text(json.dumps(auth_data))

    with patch.dict("os.environ", {"CODEX_HOME": str(tmp_path)}):
        token = resolve_codex_oauth_token()

    assert token == "token-from-file"


def test_resolve_codex_oauth_token_raises_when_nothing_available(
    tmp_path: Path,
) -> None:
    """RuntimeError is raised when no override and no auth.json exist."""
    empty_dir = tmp_path / "empty"
    empty_dir.mkdir()

    with patch.dict("os.environ", {"CODEX_HOME": str(empty_dir)}):
        with pytest.raises(RuntimeError, match="No Codex OAuth token"):
            resolve_codex_oauth_token()


def test_resolve_codex_oauth_token_handles_corrupt_auth_json(
    tmp_path: Path,
) -> None:
    """A corrupt auth.json falls through to RuntimeError gracefully."""
    auth_file = tmp_path / "auth.json"
    auth_file.write_text("not-valid-json{{{")

    with patch.dict("os.environ", {"CODEX_HOME": str(tmp_path)}):
        with pytest.raises(RuntimeError, match="No Codex OAuth token"):
            resolve_codex_oauth_token()


# ---------------------------------------------------------------------------
# make_image_gen_tool — schema / registration
# ---------------------------------------------------------------------------


def test_make_image_gen_tool_name(tmp_path: Path) -> None:
    """Tool is registered under the expected name."""
    tool = make_image_gen_tool(workspace_root=tmp_path)
    assert tool.name == "generate_image"


def test_make_image_gen_tool_parameters_schema(tmp_path: Path) -> None:
    """Parameters schema exposes prompt (required), size, quality, filename."""
    tool = make_image_gen_tool(workspace_root=tmp_path)
    props = tool.parameters["properties"]
    assert "prompt" in props
    assert "size" in props
    assert "quality" in props
    assert "filename" in props
    assert tool.parameters["required"] == ["prompt"]


# ---------------------------------------------------------------------------
# make_image_gen_tool — execute (mocked network)
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_execute_saves_image_to_workspace(tmp_path: Path) -> None:
    """A successful generate call saves a PNG under generated_images/."""
    png_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100  # minimal fake PNG header

    async def _fake_generate(prompt: str, *, oauth_token: str, size: str, quality: str) -> bytes:
        return png_bytes

    tool = make_image_gen_tool(workspace_root=tmp_path)

    with (
        patch(
            "app.core.tools.image_gen_agent.resolve_codex_oauth_token",
            return_value="fake-token",
        ),
        patch(
            "app.core.tools.image_gen_agent.generate_image_via_codex",
            side_effect=_fake_generate,
        ),
    ):
        result_json = await tool.execute("call-id-1", prompt="a friendly robot")

    result = json.loads(result_json)
    assert result["status"] == "success"
    saved = tmp_path / result["path"]
    assert saved.exists()
    assert saved.read_bytes() == png_bytes


@pytest.mark.anyio
async def test_execute_returns_error_when_no_token(tmp_path: Path) -> None:
    """Missing Codex OAuth token returns a JSON error, not an exception."""
    tool = make_image_gen_tool(workspace_root=tmp_path)

    with patch(
        "app.core.tools.image_gen_agent.resolve_codex_oauth_token",
        side_effect=RuntimeError("No Codex OAuth token found"),
    ):
        result_json = await tool.execute("call-id-2", prompt="a cat")

    result = json.loads(result_json)
    assert "error" in result
    assert "Codex OAuth" in result["error"]


@pytest.mark.anyio
async def test_execute_returns_error_on_generation_failure(tmp_path: Path) -> None:
    """HTTP/generation errors are caught and returned as JSON, not raised."""
    tool = make_image_gen_tool(workspace_root=tmp_path)

    with (
        patch(
            "app.core.tools.image_gen_agent.resolve_codex_oauth_token",
            return_value="fake-token",
        ),
        patch(
            "app.core.tools.image_gen_agent.generate_image_via_codex",
            side_effect=ValueError("stream ended without image"),
        ),
    ):
        result_json = await tool.execute("call-id-3", prompt="a dog")

    result = json.loads(result_json)
    assert "error" in result


@pytest.mark.anyio
async def test_execute_respects_custom_filename(tmp_path: Path) -> None:
    """A caller-supplied filename overrides the auto-generated slug."""
    png_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 50

    async def _fake_generate(prompt: str, *, oauth_token: str, size: str, quality: str) -> bytes:
        return png_bytes

    tool = make_image_gen_tool(workspace_root=tmp_path)

    with (
        patch(
            "app.core.tools.image_gen_agent.resolve_codex_oauth_token",
            return_value="fake-token",
        ),
        patch(
            "app.core.tools.image_gen_agent.generate_image_via_codex",
            side_effect=_fake_generate,
        ),
    ):
        result_json = await tool.execute(
            "call-id-4",
            prompt="test",
            filename="my_custom_image",
        )

    result = json.loads(result_json)
    assert result["status"] == "success"
    assert "my_custom_image" in result["path"]


# ---------------------------------------------------------------------------
# agent_tools integration
# ---------------------------------------------------------------------------


def test_build_agent_tools_includes_generate_image(tmp_path: Path) -> None:
    """``build_agent_tools`` always includes the image generation tool."""
    from app.core.agent_tools import build_agent_tools

    tools = build_agent_tools(workspace_root=tmp_path)
    assert "generate_image" in [t.name for t in tools]


# ---------------------------------------------------------------------------
# _maybe_image_event (chat.py helper) — unit tests
# ---------------------------------------------------------------------------


def test_maybe_image_event_emits_image_event_on_success(tmp_path: Path) -> None:
    """Happy path: valid tool result JSON + file on disk → image SSE event."""
    import base64
    import json

    from app.api.chat import _maybe_image_event
    from app.core.providers.base import StreamEvent

    png_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
    (tmp_path / "generated_images").mkdir()
    (tmp_path / "generated_images" / "test.png").write_bytes(png_bytes)

    event = StreamEvent(
        type="tool_result",
        tool_use_id="tc-img-1",
        content=json.dumps(
            {
                "status": "success",
                "path": "generated_images/test.png",
                "size_bytes": len(png_bytes),
            }
        ),
    )

    result = _maybe_image_event(event, tmp_path)

    assert result is not None
    assert result["type"] == "image"
    img = result["image"]
    assert img["id"] == "img_tc-img-1"
    assert img["mime_type"] == "image/png"
    assert img["path"] == "generated_images/test.png"
    assert img["tool_use_id"] == "tc-img-1"
    # Verify the base64 round-trips back to the original bytes.
    assert base64.b64decode(img["b64"]) == png_bytes


def test_maybe_image_event_returns_none_on_missing_file(tmp_path: Path) -> None:
    """File not on disk → None (no image event, no crash)."""
    import json

    from app.api.chat import _maybe_image_event
    from app.core.providers.base import StreamEvent

    event = StreamEvent(
        type="tool_result",
        tool_use_id="tc-img-2",
        content=json.dumps({"status": "success", "path": "generated_images/ghost.png"}),
    )

    assert _maybe_image_event(event, tmp_path) is None


def test_maybe_image_event_returns_none_on_failed_result(tmp_path: Path) -> None:
    """Tool result with status != success → None."""
    import json

    from app.api.chat import _maybe_image_event
    from app.core.providers.base import StreamEvent

    event = StreamEvent(
        type="tool_result",
        tool_use_id="tc-img-3",
        content=json.dumps({"status": "error", "error": "No Codex OAuth token"}),
    )

    assert _maybe_image_event(event, tmp_path) is None


def test_maybe_image_event_returns_none_on_malformed_json(tmp_path: Path) -> None:
    """Malformed JSON content → None, no exception."""
    from app.api.chat import _maybe_image_event
    from app.core.providers.base import StreamEvent

    event = StreamEvent(
        type="tool_result",
        tool_use_id="tc-img-4",
        content="not json at all",
    )

    assert _maybe_image_event(event, tmp_path) is None


# ---------------------------------------------------------------------------
# ChatTurnAggregator — image event handling
# ---------------------------------------------------------------------------


def test_aggregator_accumulates_image_events() -> None:
    """ChatTurnAggregator correctly stores image events in generated_images."""
    from app.core.chat_aggregator import ChatTurnAggregator
    from app.core.providers.base import StreamEvent

    agg = ChatTurnAggregator()
    img_event = StreamEvent(
        type="image",
        image={
            "id": "img_tc-1",
            "b64": "AAAA",
            "mime_type": "image/png",
            "path": "generated_images/foo.png",
            "tool_use_id": "tc-1",
        },
    )

    agg.apply(img_event)

    assert len(agg.generated_images) == 1
    stored = agg.generated_images[0]
    assert stored["id"] == "img_tc-1"
    assert stored["b64"] == "AAAA"


def test_aggregator_does_not_persist_images_in_snapshot() -> None:
    """generated_images are transient — to_persisted_shape() doesn't include them."""
    from app.core.chat_aggregator import ChatTurnAggregator
    from app.core.providers.base import StreamEvent

    agg = ChatTurnAggregator()
    agg.apply(StreamEvent(type="delta", content="hello"))
    agg.apply(
        StreamEvent(
            type="image",
            image={"id": "img_x", "b64": "YQ==", "mime_type": "image/png",
                   "path": "x.png", "tool_use_id": "tc-x"},
        )
    )

    snapshot = agg.to_persisted_shape(status="complete")
    assert "generated_images" not in snapshot
