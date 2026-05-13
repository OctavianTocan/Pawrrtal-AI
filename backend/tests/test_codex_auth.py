"""Tests for the shared Codex OAuth resolution helpers."""

from __future__ import annotations

import base64
import json
import os
from pathlib import Path

import pytest

from app.core.codex_auth import (
    CodexAuthError,
    _decode_account_id_from_jwt,
    resolve_codex_credentials,
)


def _fake_jwt(payload: dict) -> str:
    """Build a JWT-shaped string with a payload but no real signature.

    Header is a static stub — the resolver only decodes the payload
    segment, so this is enough for the test.
    """
    header_b64 = base64.urlsafe_b64encode(b'{"alg":"none","typ":"JWT"}').rstrip(b"=")
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8")).rstrip(b"=")
    return f"{header_b64.decode()}.{payload_b64.decode()}.sig"


def test_jwt_decoder_extracts_chatgpt_account_id() -> None:
    token = _fake_jwt(
        {"https://api.openai.com/auth": {"chatgpt_account_id": "org-tavi"}},
    )
    assert _decode_account_id_from_jwt(token) == "org-tavi"


def test_jwt_decoder_returns_none_for_malformed_token() -> None:
    assert _decode_account_id_from_jwt(None) is None
    assert _decode_account_id_from_jwt("") is None
    assert _decode_account_id_from_jwt("not.a.jwt") is None
    assert _decode_account_id_from_jwt("only-one-segment") is None


def test_jwt_decoder_returns_none_when_claim_is_missing() -> None:
    token = _fake_jwt({"sub": "user-1"})
    assert _decode_account_id_from_jwt(token) is None


def test_override_token_with_valid_claim_succeeds() -> None:
    token = _fake_jwt(
        {"https://api.openai.com/auth": {"chatgpt_account_id": "org-99"}},
    )
    creds = resolve_codex_credentials(override_token=token)
    assert creds.access_token == token
    assert creds.account_id == "org-99"


def test_override_token_without_claim_raises() -> None:
    bare = _fake_jwt({"sub": "no-account"})
    with pytest.raises(CodexAuthError, match="chatgpt_account_id"):
        resolve_codex_credentials(override_token=bare)


def test_resolves_from_codex_home_auth_file(tmp_path: Path) -> None:
    """An auth.json with explicit ``account_id`` is read directly."""
    auth = {
        "auth_mode": "chatgpt",
        "tokens": {
            "access_token": "eyJfromfile",
            "refresh_token": "rt",
            "account_id": "org-from-file",
        },
    }
    (tmp_path / "auth.json").write_text(json.dumps(auth))
    os.environ["CODEX_HOME"] = str(tmp_path)
    try:
        creds = resolve_codex_credentials()
    finally:
        os.environ.pop("CODEX_HOME", None)
    assert creds.access_token == "eyJfromfile"
    assert creds.account_id == "org-from-file"


def test_falls_back_to_jwt_claim_when_account_id_missing(tmp_path: Path) -> None:
    """Older auth.json files only carry the account id as a JWT claim."""
    id_token = _fake_jwt(
        {"https://api.openai.com/auth": {"chatgpt_account_id": "org-legacy"}},
    )
    auth = {
        "auth_mode": "chatgpt",
        "tokens": {
            "access_token": "eyJlegacy",
            "id_token": id_token,
        },
    }
    (tmp_path / "auth.json").write_text(json.dumps(auth))
    os.environ["CODEX_HOME"] = str(tmp_path)
    try:
        creds = resolve_codex_credentials()
    finally:
        os.environ.pop("CODEX_HOME", None)
    assert creds.account_id == "org-legacy"


def test_missing_auth_file_raises_with_helpful_message(tmp_path: Path) -> None:
    os.environ["CODEX_HOME"] = str(tmp_path)
    try:
        with pytest.raises(CodexAuthError, match="codex login"):
            resolve_codex_credentials()
    finally:
        os.environ.pop("CODEX_HOME", None)


def test_malformed_auth_file_raises(tmp_path: Path) -> None:
    (tmp_path / "auth.json").write_text("{not valid json")
    os.environ["CODEX_HOME"] = str(tmp_path)
    try:
        with pytest.raises(CodexAuthError, match="Failed to read"):
            resolve_codex_credentials()
    finally:
        os.environ.pop("CODEX_HOME", None)
