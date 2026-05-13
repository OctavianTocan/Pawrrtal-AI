"""Shared Codex OAuth helpers for the image-gen tool + text provider.

Lifted out of ``app.core.tools.image_gen`` so both the tool and the new
``OpenAICodexProvider`` resolve auth identically.  See
``docs/design/codex-oauth-text-provider.md`` for the full wire spec.

Resolution order
----------------
1. Explicit ``override`` (workspace-level setting).
2. ``$CODEX_HOME/auth.json`` (default: ``~/.codex/auth.json``) written
   by the official ``@openai/codex`` CLI.

Notes
-----
- ``account_id`` is required by the Codex backend's ``chatgpt-account-id``
  header.  Modern ``auth.json`` writes it under ``tokens.account_id``;
  older versions only stored it as a JWT claim under
  ``https://api.openai.com/auth.chatgpt_account_id``.  Both paths are
  handled.
- Refresh is **not** implemented here yet; the existing image-gen tool
  has been running fine without explicit refresh because the CLI keeps
  the token fresh in parallel.  Wire token-refresh into this module
  when the provider goes live so we don't depend on the CLI being
  present at runtime (see design doc § "Refresh").
"""

from __future__ import annotations

import base64
import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)


CODEX_RESPONSES_URL = "https://chatgpt.com/backend-api/codex/responses"
"""Codex backend endpoint for both image-gen and text completions."""

DEFAULT_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann"
"""OAuth client ID used by the official Codex CLI.  Re-used here so the
token cached in ``~/.codex/auth.json`` is usable by us without a
separate OAuth registration."""

TOKEN_URL = "https://auth.openai.com/oauth/token"
"""Refresh endpoint — used when we wire token refresh in a follow-up."""


@dataclass(frozen=True)
class CodexCredentials:
    """Resolved access token + ChatGPT account id for the request headers."""

    access_token: str
    account_id: str


class CodexAuthError(RuntimeError):
    """Raised when no Codex auth is available or it is malformed."""


def _decode_account_id_from_jwt(token: str | None) -> str | None:
    """Return the ``chatgpt_account_id`` claim from a JWT, or ``None``.

    Used as a fallback when older auth.json files don't carry
    ``tokens.account_id`` directly.  Safe against malformed tokens —
    swallows decoding errors and returns ``None``.
    """
    if not token:
        return None
    try:
        parts = token.split(".")
        if len(parts) < 2:
            return None
        # JWT base64url payload — pad to multiple of 4 then b64decode.
        payload_b64 = parts[1] + "=" * (-len(parts[1]) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64).decode("utf-8"))
        claim = payload.get("https://api.openai.com/auth") or {}
        account_id = claim.get("chatgpt_account_id")
        return str(account_id) if account_id else None
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError, KeyError):
        return None


def resolve_codex_credentials(
    override_token: str | None = None,
) -> CodexCredentials:
    """Return the bearer token + account id for the Codex backend.

    Args:
        override_token: Pre-resolved access token (e.g. from a workspace
            env override).  When supplied, ``account_id`` is recovered
            from the token's JWT payload.

    Raises:
        CodexAuthError: When no usable credentials are found.
    """
    if override_token:
        account_id = _decode_account_id_from_jwt(override_token)
        if not account_id:
            raise CodexAuthError(
                "OPENAI_CODEX_OAUTH_TOKEN was set but the token does not carry "
                "a chatgpt_account_id claim.  Re-run `codex login` to get a fresh token."
            )
        return CodexCredentials(access_token=override_token, account_id=account_id)

    codex_home = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))
    auth_file = codex_home / "auth.json"
    if not auth_file.exists():
        raise CodexAuthError(
            f"No Codex auth file at {auth_file}.  Run `codex login` or set "
            "OPENAI_CODEX_OAUTH_TOKEN."
        )

    try:
        data = json.loads(auth_file.read_text())
    except (OSError, json.JSONDecodeError) as exc:
        raise CodexAuthError(f"Failed to read {auth_file}: {exc}") from exc

    tokens = data.get("tokens") or {}
    access_token = tokens.get("access_token")
    if not access_token:
        raise CodexAuthError(
            f"{auth_file} has no tokens.access_token.  Run `codex login` again."
        )

    account_id = tokens.get("account_id") or _decode_account_id_from_jwt(
        tokens.get("id_token") or access_token
    )
    if not account_id:
        raise CodexAuthError(
            f"{auth_file} carries an access_token but no chatgpt_account_id "
            "could be resolved.  Re-run `codex login` to get a fresh token."
        )

    return CodexCredentials(access_token=access_token, account_id=str(account_id))


# Backwards-compat alias kept so image_gen.py can adopt this module without
# a renaming churn in the same PR.  Drop once both call sites use the new
# function explicitly.
def resolve_codex_oauth_token(override: str | None = None) -> str:
    """Legacy alias — returns only the access token.

    Prefer :func:`resolve_codex_credentials` for new code; it returns
    the account id as well.
    """
    return resolve_codex_credentials(override_token=override).access_token
