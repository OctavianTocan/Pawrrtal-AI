"""Settings smoke test for the LCM configuration knobs.

Part of the LCM stack — PR #1 (design doc + settings).
Confirms the five new config keys have safe off-by-default values so
this PR cannot change runtime behaviour for any existing deployment.
"""

from __future__ import annotations


def test_lcm_settings_have_safe_defaults() -> None:
    """All LCM knobs must have sane off-by-default values."""
    from app.core.config import settings

    # Master switch off — no chat-router code path is altered.
    assert settings.lcm_enabled is False
    # Numeric defaults match the upstream plugin.
    assert settings.lcm_fresh_tail_count == 64
    assert settings.lcm_leaf_chunk_tokens == 20000
    assert 0.0 < settings.lcm_context_threshold <= 1.0
    # Leaf-only condensation by default.
    assert settings.lcm_incremental_max_depth == 1
    # No summary-model override — falls back to the conversation model.
    assert settings.lcm_summary_model == ""
