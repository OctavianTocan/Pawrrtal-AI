"""Shared gating + fixtures for the integration test suite.

Every test in ``tests/integration/`` skips automatically when:

  * ``RUN_INTEGRATION_TESTS`` is unset / falsy in the environment, OR
  * the credentials needed for the test's specific provider aren't set.

This keeps the default ``uv run pytest`` invocation hermetic — no
network calls, no token requirement — while letting the integration
workflow opt in by exporting ``RUN_INTEGRATION_TESTS=1`` and the
relevant secrets.
"""

from __future__ import annotations

import os

import pytest


def _truthy(value: str | None) -> bool:
    return value is not None and value.strip().lower() in {"1", "true", "yes", "on"}


# Module-level guard: the whole directory is skipped unless the
# operator opted in.  This is cheaper than per-test skipif and gives
# one obvious place to look for the gate.
if not _truthy(os.environ.get("RUN_INTEGRATION_TESTS")):
    pytest.skip(
        "Integration tests skipped — set RUN_INTEGRATION_TESTS=1 to opt in.",
        allow_module_level=True,
    )


@pytest.fixture(scope="session")
def claude_oauth_token() -> str:
    """OAuth token forwarded to the Claude SDK's CLI subprocess.

    Skips the test when absent so a partially-credentialed CI run
    (e.g. only Gemini secrets present) still passes the Claude-only
    integration tests by skipping rather than failing.
    """
    token = os.environ.get("CLAUDE_CODE_OAUTH_TOKEN")
    if not token:
        pytest.skip(
            "CLAUDE_CODE_OAUTH_TOKEN not set — skipping Claude integration test."
        )
    return token


@pytest.fixture(scope="session")
def claude_model_id() -> str:
    """Cheapest Claude model the SDK will route to — used to keep CI cost bounded.

    Override via ``CLAUDE_INTEGRATION_MODEL`` if a future, cheaper
    model lands.  Haiku 4.5 was the operator's pick at PR #131 review
    time.
    """
    return os.environ.get("CLAUDE_INTEGRATION_MODEL", "claude-haiku-4-5")
