"""Webhook signature / auth verification helpers.

* :func:`verify_github_signature` — HMAC-SHA256 against the request
  body, matching GitHub's published format
  (``X-Hub-Signature-256: sha256=<hex>``).
* :func:`verify_shared_secret` — constant-time compare against a
  ``Authorization: Bearer <token>`` header for non-GitHub providers.

Both use :func:`hmac.compare_digest` so timing differences can't
leak the secret.  Both return ``False`` on any malformed input
rather than raising — the receiver decides the HTTP status.
"""

from __future__ import annotations

import hashlib
import hmac

# GitHub publishes signatures as ``sha256=<hex>``; the prefix is
# constant.  Pulled into a constant so a future provider with a
# different prefix (`sha512=...`) can ride the same parser.
_GITHUB_SIG_PREFIX = "sha256="
_BEARER_PREFIX = "Bearer "


def verify_github_signature(
    body: bytes,
    header_value: str | None,
    secret: str,
) -> bool:
    """Constant-time check on a GitHub HMAC-SHA256 webhook signature."""
    if not header_value or not secret:
        return False
    if not header_value.startswith(_GITHUB_SIG_PREFIX):
        return False
    expected = hmac.new(
        secret.encode("utf-8"),
        msg=body,
        digestmod=hashlib.sha256,
    ).hexdigest()
    actual = header_value[len(_GITHUB_SIG_PREFIX) :].strip()
    return hmac.compare_digest(expected, actual)


def verify_shared_secret(
    authorization_header: str | None,
    secret: str,
) -> bool:
    """Constant-time check on an ``Authorization: Bearer <token>`` header."""
    if not authorization_header or not secret:
        return False
    if not authorization_header.startswith(_BEARER_PREFIX):
        return False
    presented = authorization_header[len(_BEARER_PREFIX) :].strip()
    return hmac.compare_digest(presented, secret)
