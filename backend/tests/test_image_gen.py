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
