"""Tests for the convert_to_markdown AgentTool.

Covers:
  - Path-traversal protection (OUT_OF_ROOT).
  - INVALID_PATH when 'path' argument is omitted.
  - NOT_FOUND when the target file does not exist.
  - WRONG_KIND when the target is a directory.
  - IO_ERROR surfaced when markitdown raises.
  - Happy path returns the text_content from markitdown.
  - Tool registered in build_agent_tools output.
"""

from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.agent_tools import build_agent_tools
from app.core.tools.errors import ToolErrorCode
from app.core.tools.markitdown_convert import make_markitdown_tool


@pytest.fixture
def workspace(tmp_path: Path) -> Path:
    """Return a minimal workspace with a sample convertible file."""
    (tmp_path / "report.html").write_text("<h1>Hello</h1>", encoding="utf-8")
    (tmp_path / "subdir").mkdir()
    return tmp_path


def _tool(root: Path) -> object:
    return make_markitdown_tool(workspace_root=root)


def _fake_converter(text: str) -> MagicMock:
    """Return a mock MarkItDown whose convert() returns *text* as text_content."""
    instance = MagicMock()
    instance.convert.return_value = SimpleNamespace(text_content=text)
    cls = MagicMock(return_value=instance)
    return cls


# ---------------------------------------------------------------------------
# Argument validation
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_missing_path_returns_invalid_path(workspace: Path) -> None:
    tool = _tool(workspace)
    out = await tool.execute("call-1")  # type: ignore[union-attr]
    assert out.startswith(f"[{ToolErrorCode.INVALID_PATH.value}]")


@pytest.mark.anyio
async def test_empty_path_returns_invalid_path(workspace: Path) -> None:
    tool = _tool(workspace)
    out = await tool.execute("call-2", path="")  # type: ignore[union-attr]
    assert out.startswith(f"[{ToolErrorCode.INVALID_PATH.value}]")


# ---------------------------------------------------------------------------
# Path traversal
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_traversal_attempt_returns_out_of_root(workspace: Path) -> None:
    tool = _tool(workspace)
    out = await tool.execute("call-3", path="../../etc/passwd")  # type: ignore[union-attr]
    assert out.startswith(f"[{ToolErrorCode.OUT_OF_ROOT.value}]")


# ---------------------------------------------------------------------------
# File existence checks
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_missing_file_returns_not_found(workspace: Path) -> None:
    tool = _tool(workspace)
    out = await tool.execute("call-4", path="missing.pdf")  # type: ignore[union-attr]
    assert out.startswith(f"[{ToolErrorCode.NOT_FOUND.value}]")


@pytest.mark.anyio
async def test_directory_target_returns_wrong_kind(workspace: Path) -> None:
    tool = _tool(workspace)
    out = await tool.execute("call-5", path="subdir")  # type: ignore[union-attr]
    assert out.startswith(f"[{ToolErrorCode.WRONG_KIND.value}]")


# ---------------------------------------------------------------------------
# Conversion happy path
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_successful_conversion_returns_markdown(workspace: Path) -> None:
    fake_cls = _fake_converter("# Hello\n")
    with patch("app.core.tools.markitdown_convert.MarkItDown", fake_cls):
        tool = _tool(workspace)
        out = await tool.execute("call-6", path="report.html")  # type: ignore[union-attr]
    assert out == "# Hello\n"


@pytest.mark.anyio
async def test_empty_text_content_returns_placeholder(workspace: Path) -> None:
    fake_cls = _fake_converter("")
    with patch("app.core.tools.markitdown_convert.MarkItDown", fake_cls):
        tool = _tool(workspace)
        out = await tool.execute("call-7", path="report.html")  # type: ignore[union-attr]
    assert out == "(empty document)"


# ---------------------------------------------------------------------------
# Conversion failure
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_converter_exception_returns_io_error(workspace: Path) -> None:
    instance = MagicMock()
    instance.convert.side_effect = RuntimeError("unsupported format")
    fake_cls = MagicMock(return_value=instance)
    with patch("app.core.tools.markitdown_convert.MarkItDown", fake_cls):
        tool = _tool(workspace)
        out = await tool.execute("call-8", path="report.html")  # type: ignore[union-attr]
    assert out.startswith(f"[{ToolErrorCode.IO_ERROR.value}]")
    assert "unsupported format" in out


# ---------------------------------------------------------------------------
# Tool registration in build_agent_tools
# ---------------------------------------------------------------------------


def test_convert_to_markdown_in_build_agent_tools(tmp_path: Path) -> None:
    (tmp_path / "AGENTS.md").write_text("# Test workspace")
    with patch("app.core.keys.resolve_api_key", return_value=None):
        tools = build_agent_tools(workspace_root=tmp_path)

    names = [t.name for t in tools]
    assert "convert_to_markdown" in names


def test_convert_to_markdown_precedes_send_message(tmp_path: Path) -> None:
    """convert_to_markdown must be registered before send_message."""
    (tmp_path / "AGENTS.md").write_text("# Test workspace")
    send_fn = AsyncMock(return_value=None)
    with patch("app.core.keys.resolve_api_key", return_value=None):
        tools = build_agent_tools(workspace_root=tmp_path, send_fn=send_fn)

    names = [t.name for t in tools]
    assert names.index("convert_to_markdown") < names.index("send_message")


# ---------------------------------------------------------------------------
# Extra edge cases for _resolve_safe and null text_content
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_none_text_content_from_markitdown_returns_placeholder(workspace: Path) -> None:
    """When markitdown returns None for text_content, the placeholder is used.

    This can happen with some markitdown backends that return a result
    object without populating text_content at all.
    """
    instance = MagicMock()
    instance.convert.return_value = SimpleNamespace(text_content=None)
    fake_cls = MagicMock(return_value=instance)
    with patch("app.core.tools.markitdown_convert.MarkItDown", fake_cls):
        tool = _tool(workspace)
        out = await tool.execute("call-9", path="report.html")  # type: ignore[union-attr]
    assert out == "(empty document)"


@pytest.mark.anyio
async def test_absolute_path_within_workspace_is_accepted(workspace: Path) -> None:
    """A path starting with '/' is stripped and resolved within the workspace root."""
    fake_cls = _fake_converter("# Content")
    with patch("app.core.tools.markitdown_convert.MarkItDown", fake_cls):
        tool = _tool(workspace)
        # Leading slash is stripped inside _resolve_safe via .lstrip("/").
        out = await tool.execute("call-10", path="/report.html")  # type: ignore[union-attr]
    assert out == "# Content"
