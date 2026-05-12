"""User preferences stored as a TOML file in the workspace root.

The agent can read AND write `preferences.toml` natively through the
`workspace_files` tool — no special endpoint, no schema migration, no
DB row.  This makes preferences agent-editable from every surface
(web, Electron, Telegram) without adding any new wiring.

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


def preferences_to_prompt_section(data: dict[str, Any]) -> str | None:
    """Render the preferences dict as a markdown system-prompt section.

    Returns ``None`` when *data* is empty so callers can cleanly skip
    appending the section.  Output shape:

    .. code-block:: markdown

        ## User Preferences

        ### Identity
        - **Name:** Tavi
        - **Role:** founder
        ...

        ### Context
        ...

    Sections appear in a stable order so the prompt is deterministic.
    Unknown sections are appended verbatim at the end.
    """
    if not data:
        return None

    lines: list[str] = ["## User Preferences", ""]
    # Known sections are always claimed so an empty-but-present section
    # (e.g. ``{"identity": {}}``) doesn't bleed into the "Other" fallback.
    rendered_keys: set[str] = {"identity", "context", "goals", "channels"}

    # ── Identity ──
    identity = data.get("identity") or {}
    if identity:
        lines.append("### Identity")
        for label, field in (
            ("Name", "name"),
            ("Role", "role"),
            ("Company / Website", "company_website"),
            ("LinkedIn", "linkedin"),
        ):
            val = identity.get(field)
            if val:
                lines.append(f"- **{label}:** {val}")
        lines.append("")

    # ── Context ──
    context = data.get("context") or {}
    if context:
        lines.append("### Context")
        chatgpt_context = context.get("chatgpt_context")
        if chatgpt_context:
            lines.append("**About the user:**")
            lines.append("")
            lines.append(chatgpt_context.strip())
            lines.append("")
        custom_instructions = context.get("custom_instructions")
        if custom_instructions:
            lines.append("**How to respond:**")
            lines.append("")
            lines.append(custom_instructions.strip())
            lines.append("")

    # ── Goals ──
    goals = data.get("goals") or {}
    if goals:
        items = goals.get("items") or []
        if items:
            lines.append("### Goals")
            for item in items:
                lines.append(f"- {item}")
            lines.append("")

    # ── Channels ──
    channels = data.get("channels") or {}
    if channels:
        connected = channels.get("connected") or []
        if connected:
            lines.append("### Connected Channels")
            lines.append(", ".join(connected))
            lines.append("")

    # ── Unknown sections — appended verbatim so user-defined sections
    # still surface to the agent even if we haven't formally modelled them.
    extras = {k: v for k, v in data.items() if k not in rendered_keys}
    if extras:
        lines.append("### Other")
        for key, value in extras.items():
            lines.append(f"**{key}:** {value}")
        lines.append("")

    # If nothing got rendered (e.g. all sections were empty dicts) treat
    # as no preferences.
    if len(lines) == 2:
        return None

    return "\n".join(lines).rstrip() + "\n"
