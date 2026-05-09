"""Per-user workspace environment variable management.

Workspace env files are encrypted at rest on the filesystem. They live at
``/workspace/{user_id}/.env`` and allow users to override gateway-level
environment variables (e.g. their own GEMINI_API_KEY) without modifying
the server's global .env.

Resolution order for any key:
  1. Workspace override  (from /workspace/{user_id}/.env, encrypted at rest)
  2. Gateway global     (from the server's own .env via Settings)
  3. None
"""

from __future__ import annotations

import uuid
from pathlib import Path

from cryptography.fernet import Fernet

from app.core.config import settings

WORKSPACE_BASE = Path("/workspace")

OVERRIDABLE_KEYS: frozenset[str] = frozenset(
    {
        "GEMINI_API_KEY",
        "CLAUDE_CODE_OAUTH_TOKEN",
        "EXA_API_KEY",
        "XAI_API_KEY",
    }
)

_SETTINGS_ATTR_MAP: dict[str, str] = {
    "GEMINI_API_KEY": "google_api_key",
    "CLAUDE_CODE_OAUTH_TOKEN": "claude_code_oauth_token",
    "EXA_API_KEY": "exa_api_key",
    "XAI_API_KEY": "xai_api_key",
}

_env_cache: dict[str, tuple[float, dict[str, str]]] = {}


def _get_fernet() -> Fernet:
    return Fernet(settings.workspace_encryption_key.encode())


def get_workspace_env_path(user_id: uuid.UUID) -> Path:
    return WORKSPACE_BASE / str(user_id) / ".env"


def load_workspace_env(user_id: uuid.UUID) -> dict[str, str]:
    path = get_workspace_env_path(user_id)
    if not path.exists():
        return {}
    plaintext = _get_fernet().decrypt(path.read_bytes()).decode()
    env: dict[str, str] = {}
    for line in plaintext.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            key, _, value = line.partition("=")
            env[key.strip()] = value.strip()
    return env


def save_workspace_env(user_id: uuid.UUID, env: dict[str, str]) -> None:
    path = get_workspace_env_path(user_id)
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    lines = "\n".join(f"{k}={v}" for k, v in env.items())
    ciphertext = _get_fernet().encrypt(lines.encode())
    path.write_bytes(ciphertext)
    path.chmod(0o600)
    _env_cache.pop(str(user_id), None)


def resolve_api_key(user_id: uuid.UUID, workspace_key: str) -> str | None:
    if not settings.workspace_encryption_key:
        return None
    uid = str(user_id)
    path = get_workspace_env_path(user_id)
    mtime = path.stat().st_mtime if path.exists() else 0.0
    if uid not in _env_cache or _env_cache[uid][0] != mtime:
        _env_cache[uid] = (mtime, load_workspace_env(user_id) if mtime else {})
    workspace = _env_cache[uid][1]
    if workspace.get(workspace_key):
        return workspace[workspace_key]
    settings_attr = _SETTINGS_ATTR_MAP.get(workspace_key)
    if settings_attr:
        return getattr(settings, settings_attr, None)
    return None
