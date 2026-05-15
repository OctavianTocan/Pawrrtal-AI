"""Tests for the webhook signature / shared-secret helpers."""

from __future__ import annotations

import hashlib
import hmac

import pytest

from app.integrations.webhooks.auth import (
    verify_github_signature,
    verify_shared_secret,
)


def _github_sig(secret: str, body: bytes) -> str:
    digest = hmac.new(secret.encode(), msg=body, digestmod=hashlib.sha256).hexdigest()
    return f"sha256={digest}"


class TestGithubSignature:
    def test_valid_signature_passes(self) -> None:
        body = b'{"ref":"refs/heads/main"}'
        secret = "shhh"
        assert verify_github_signature(body, _github_sig(secret, body), secret) is True

    def test_invalid_signature_fails(self) -> None:
        body = b'{"ref":"refs/heads/main"}'
        assert verify_github_signature(body, "sha256=deadbeef", "shhh") is False

    def test_missing_header_fails(self) -> None:
        assert verify_github_signature(b"{}", None, "shhh") is False

    def test_missing_secret_fails(self) -> None:
        body = b"{}"
        assert verify_github_signature(body, _github_sig("shhh", body), "") is False

    def test_wrong_prefix_fails(self) -> None:
        body = b"{}"
        digest = hmac.new(b"shhh", msg=body, digestmod=hashlib.sha256).hexdigest()
        assert verify_github_signature(body, f"sha512={digest}", "shhh") is False

    def test_body_mutation_fails(self) -> None:
        body = b'{"original":1}'
        sig = _github_sig("shhh", body)
        tampered = b'{"original":2}'
        assert verify_github_signature(tampered, sig, "shhh") is False


class TestSharedSecret:
    def test_valid_bearer_passes(self) -> None:
        assert verify_shared_secret("Bearer letmein", "letmein") is True

    @pytest.mark.parametrize(
        "header",
        ["", None, "letmein", "Basic letmein", "Bearer wrong"],
    )
    def test_invalid_headers_fail(self, header: str | None) -> None:
        assert verify_shared_secret(header, "letmein") is False

    def test_missing_secret_fails(self) -> None:
        assert verify_shared_secret("Bearer letmein", "") is False
