"""Workspace-scoped file tools for the agent loop.

Provides ``read_file``, ``write_file``, and ``list_dir`` as :class:`AgentTool`
instances bound to a specific workspace root directory.  Path traversal is
blocked: any path that resolves outside the workspace root returns an error
string rather than raising, so the agent can read the message and adjust.

All paths passed by the model are interpreted relative to the workspace root.
The agent should treat the root as ``/`` (or ``.``).

Usage::

    from pathlib import Path
    from app.core.tools.workspace_files import make_workspace_tools

    tools = make_workspace_tools(Path("/data/workspaces/<uuid>"))
    # Pass ``tools`` into AgentContext.tools before calling agent_loop().
"""

from __future__ import annotations

import logging
from pathlib import Path

from app.core.agent_loop.types import AgentTool

log = logging.getLogger(__name__)

# Maximum bytes read_file will return so the model context doesn't blow up.
_MAX_READ_BYTES = 128_000  # 128 KB
# Maximum number of entries list_dir will return.
_MAX_LIST_ENTRIES = 200


def _resolve_safe(root: Path, rel_path: str) -> Path | None:
    """Resolve *rel_path* relative to *root* and return it if still inside.

    Returns ``None`` when the resolved path escapes the workspace root.
    """
    try:
        target = (root / rel_path.lstrip("/")).resolve()
    except Exception:
        return None
    # resolve() follows symlinks; check the string prefix.
    if not str(target).startswith(str(root.resolve())):
        return None
    return target


def _fmt_size(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n}{unit}"
        n //= 1024
    return f"{n}TB"


def _make_read_file(root: Path) -> AgentTool:
    async def execute(tool_call_id: str, path: str) -> str:  # noqa: ARG001
        target = _resolve_safe(root, path)
        if target is None:
            return f"Error: path '{path}' is outside the workspace root."
        if not target.exists():
            return f"Error: '{path}' does not exist."
        if not target.is_file():
            return f"Error: '{path}' is a directory, not a file."
        try:
            raw = target.read_bytes()
        except OSError as exc:
            return f"Error reading '{path}': {exc}"
        if len(raw) > _MAX_READ_BYTES:
            raw = raw[:_MAX_READ_BYTES]
            suffix = f"\n\n[truncated — file exceeds {_MAX_READ_BYTES // 1024} KB]"
        else:
            suffix = ""
        try:
            return raw.decode("utf-8") + suffix
        except UnicodeDecodeError:
            return f"Error: '{path}' is a binary file and cannot be read as text."

    return AgentTool(
        name="read_file",
        description=(
            "Read the text content of a file in the workspace. "
            "Paths are relative to the workspace root. "
            "Binary files and files larger than 128 KB are rejected or truncated."
        ),
        parameters={
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": (
                        "File path relative to the workspace root, e.g. 'AGENTS.md' "
                        "or 'memory/2026-05-07.md'."
                    ),
                }
            },
            "required": ["path"],
        },
        execute=execute,
    )


def _make_write_file(root: Path) -> AgentTool:
    async def execute(tool_call_id: str, path: str, content: str) -> str:  # noqa: ARG001
        target = _resolve_safe(root, path)
        if target is None:
            return f"Error: path '{path}' is outside the workspace root."
        if target.is_dir():
            return f"Error: '{path}' is a directory."
        try:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding="utf-8")
        except OSError as exc:
            return f"Error writing '{path}': {exc}"
        return f"Written {len(content)} characters to '{path}'."

    return AgentTool(
        name="write_file",
        description=(
            "Write text content to a file in the workspace, creating it if it "
            "does not exist and overwriting it if it does. "
            "Parent directories are created automatically. "
            "Paths are relative to the workspace root."
        ),
        parameters={
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "File path relative to the workspace root.",
                },
                "content": {
                    "type": "string",
                    "description": "Full text content to write. Overwrites the existing file.",
                },
            },
            "required": ["path", "content"],
        },
        execute=execute,
    )


def _make_list_dir(root: Path) -> AgentTool:
    async def execute(tool_call_id: str, path: str = "") -> str:  # noqa: ARG001
        target = _resolve_safe(root, path or "")
        if target is None:
            return f"Error: path '{path}' is outside the workspace root."
        if not target.exists():
            return f"Error: '{path}' does not exist."
        if not target.is_dir():
            return f"Error: '{path}' is a file, not a directory. Use read_file to read it."
        try:
            entries = sorted(target.iterdir(), key=lambda p: (p.is_file(), p.name))
        except OSError as exc:
            return f"Error listing '{path}': {exc}"

        if not entries:
            return f"'{path or '.'}' is empty."

        lines: list[str] = []
        for entry in entries[:_MAX_LIST_ENTRIES]:
            rel = entry.relative_to(root)
            if entry.is_dir():
                lines.append(f"[dir]  {rel}/")
            else:
                size = _fmt_size(entry.stat().st_size)
                lines.append(f"[file] {rel}  ({size})")

        if len(entries) > _MAX_LIST_ENTRIES:
            lines.append(f"... and {len(entries) - _MAX_LIST_ENTRIES} more entries")

        return "\n".join(lines)

    return AgentTool(
        name="list_dir",
        description=(
            "List the contents of a directory in the workspace. "
            "Shows directories with a trailing '/' and files with their sizes. "
            "Call with no path (or empty string) to list the workspace root."
        ),
        parameters={
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": (
                        "Directory path relative to the workspace root. "
                        "Omit or pass '' to list the root."
                    ),
                }
            },
            "required": [],
        },
        execute=execute,
    )


def make_workspace_tools(workspace_root: Path) -> list[AgentTool]:
    """Return a list of file-access AgentTools scoped to *workspace_root*.

    All paths are resolved relative to *workspace_root* and path traversal
    is blocked.  Pass the returned list into ``AgentContext.tools`` before
    calling ``agent_loop()``.

    Args:
        workspace_root: Absolute path to the workspace directory.  Must
            already exist on disk.

    Returns:
        ``[read_file, write_file, list_dir]`` AgentTool instances.
    """
    root = Path(workspace_root).resolve()
    return [
        _make_read_file(root),
        _make_write_file(root),
        _make_list_dir(root),
    ]
