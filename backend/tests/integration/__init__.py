"""Integration tests — hit real third-party APIs.

These tests are gated on the ``RUN_INTEGRATION_TESTS=1`` environment
variable AND the relevant credentials (e.g. ``CLAUDE_CODE_OAUTH_TOKEN``)
being present.  When either is missing every test in this directory is
skipped with a clear message; the unit-test suite is unaffected.

CI runs them on PRs that touch the agent loop, providers, or tools —
see ``.github/workflows/integration-tests.yml``.  Local runs are
opt-in:

    RUN_INTEGRATION_TESTS=1 \\
      CLAUDE_CODE_OAUTH_TOKEN=$(cat ~/.config/claude/oauth_token) \\
      uv run pytest tests/integration/ -v

We use the cheapest available models per provider (Haiku for Claude,
Flash for Gemini) so a CI run on every PR costs cents, not dollars.
"""
