"""User preferences stored as a TOML file in the workspace root.

The agent can read AND write `preferences.toml` natively through the
`workspace_files` tool — no special endpoint, no schema migration, no
DB row.  This makes preferences agent-editable from every surface
(web, Electron, Telegram) without adding any new wiring.

**The file is NOT auto-injected into the system prompt.**  It's a
standard workspace file; the agent reads it via ``workspace_files``
when and only when it's relevant.  This keeps every-turn context lean.

File location
-------------
``{workspace_root}/preferences.toml``

Canonical shape
---------------
.. code-block:: toml

    [identity]
    name = "Tavi"
    role = "founder"
    company_website = "pawrrtal.ai"
    linkedin = "https://linkedin.com/in/octaviantocan"

    [context]
    chatgpt_context = "Multi-line context block..."
    custom_instructions = "Be terse. Skip throat-clearing."

    [goals]
    items = ["ship demo mode", "wire allowed_emails to routes"]

    [channels]
    connected = ["telegram", "google"]

Every section and every field is optional — a partial file round-trips
cleanly.  Missing sections are treated as empty dicts.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import tomli_w
import tomllib

log = logging.getLogger(__name__)

PREFERENCES_FILENAME = "preferences.toml"

# Generous cap to keep the system prompt size predictable even if a user
# (or an over-eager agent) stuffs a huge context block into the file.
_MAX_BYTES = 32_000


def _preferences_path(workspace_root: Path) -> Path:
    """Return the canonical path for the preferences file."""
    return workspace_root / PREFERENCES_FILENAME


def read_preferences(workspace_root: Path) -> dict[str, Any]:
    """Read `preferences.toml` and return the parsed dict.

    Returns an empty dict when the file is missing, empty, or fails to
    parse — preferences are user-editable so a malformed file should
    degrade gracefully rather than blow up the agent.
    """
    path = _preferences_path(workspace_root)
    if not path.exists():
        return {}
    try:
        raw = path.read_bytes()
    except OSError as exc:
        log.warning("read_preferences: failed to read %s: %s", path, exc)
        return {}
    if not raw.strip():
        return {}
    if len(raw) > _MAX_BYTES:
        log.warning(
            "read_preferences: %s exceeds %d bytes — truncating for safety.",
            path,
            _MAX_BYTES,
        )
        raw = raw[:_MAX_BYTES]
    try:
        return tomllib.loads(raw.decode("utf-8", errors="replace"))
    except tomllib.TOMLDecodeError as exc:
        log.warning("read_preferences: TOML decode error in %s: %s", path, exc)
        return {}


def write_preferences(workspace_root: Path, data: dict[str, Any]) -> None:
    """Write the preferences dict to `preferences.toml`.

    Creates the workspace directory if it does not exist (defensive — the
    workspace is normally already present when this is called).  Skips
    keys whose values are ``None`` so the file stays clean.
    """
    workspace_root.mkdir(parents=True, exist_ok=True)
    sanitized = _strip_none(data)
    path = _preferences_path(workspace_root)
    payload = tomli_w.dumps(sanitized)
    path.write_text(payload, encoding="utf-8")


def _strip_none(value: Any) -> Any:
    """Recursively drop keys whose values are None (and empty dicts left over)."""
    if isinstance(value, dict):
        cleaned: dict[str, Any] = {}
        for key, inner in value.items():
            if inner is None:
                continue
            stripped = _strip_none(inner)
            # Drop empty nested mappings so we don't leave bare section headers.
            if isinstance(stripped, dict) and not stripped:
                continue
            cleaned[key] = stripped
        return cleaned
    if isinstance(value, list):
        return [_strip_none(v) for v in value if v is not None]
    return value



