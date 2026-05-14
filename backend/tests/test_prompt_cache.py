"""Tests for the prompt-cache observability helpers.

Pins the contract the chat router relies on: identical inputs produce
identical keys, different inputs produce different keys, and ``None`` is
treated as the empty string.  A regression here would silently break the
cache-stability probe in the structured logs.
"""

from __future__ import annotations

import logging
import uuid

import pytest

from app.core.prompt_cache import compute_prompt_cache_key, log_prompt_cache_key


class TestComputePromptCacheKey:
    """Deterministic, model-aware hashing for the system prompt."""

    def test_identical_inputs_produce_identical_keys(self) -> None:
        a = compute_prompt_cache_key(
            system_prompt="hello world",
            model_id="anthropic/claude-sonnet-4-6",
        )
        b = compute_prompt_cache_key(
            system_prompt="hello world",
            model_id="anthropic/claude-sonnet-4-6",
        )
        assert a == b

    def test_different_system_prompts_produce_different_keys(self) -> None:
        a = compute_prompt_cache_key(
            system_prompt="hello",
            model_id="anthropic/claude-sonnet-4-6",
        )
        b = compute_prompt_cache_key(
            system_prompt="hello world",
            model_id="anthropic/claude-sonnet-4-6",
        )
        assert a != b

    def test_different_models_produce_different_keys(self) -> None:
        """Each model has its own cache namespace on the Anthropic side,
        so the key must differentiate by model id even with the same prompt.
        """
        a = compute_prompt_cache_key(
            system_prompt="hello",
            model_id="anthropic/claude-sonnet-4-6",
        )
        b = compute_prompt_cache_key(
            system_prompt="hello",
            model_id="anthropic/claude-haiku-4-5",
        )
        assert a != b

    def test_none_and_empty_string_share_a_key(self) -> None:
        """``None`` (no workspace prompt configured) and the empty string
        should produce the same key — both represent "no prefix to cache"."""
        none_key = compute_prompt_cache_key(
            system_prompt=None,
            model_id="anthropic/claude-sonnet-4-6",
        )
        empty_key = compute_prompt_cache_key(
            system_prompt="",
            model_id="anthropic/claude-sonnet-4-6",
        )
        assert none_key == empty_key

    def test_key_is_a_short_hex_string(self) -> None:
        key = compute_prompt_cache_key(
            system_prompt="hello",
            model_id="anthropic/claude-sonnet-4-6",
        )
        # The contract is "short, deterministic, greppable".  12 hex chars
        # is what the helper currently emits; pin it so a change is
        # explicit (the log format depends on this length).
        assert len(key) == 12
        assert all(c in "0123456789abcdef" for c in key)


def test_log_prompt_cache_key_emits_one_structured_line(
    caplog: pytest.LogCaptureFixture,
) -> None:
    """The log helper must emit exactly one ``PROMPT_CACHE`` line per call,
    carrying the conversation id, cache key, and prompt length so a log
    scan can confirm stability without re-deriving the key.
    """
    logger = logging.getLogger("test.prompt_cache")
    conversation_id = uuid.UUID("11111111-2222-3333-4444-555555555555")

    with caplog.at_level(logging.INFO, logger="test.prompt_cache"):
        log_prompt_cache_key(
            logger,
            rid="rid-abc",
            conversation_id=conversation_id,
            cache_key="deadbeef0000",
            system_prompt_chars=1234,
        )

    matching = [record for record in caplog.records if "PROMPT_CACHE" in record.getMessage()]
    assert len(matching) == 1
    message = matching[0].getMessage()
    assert "rid=rid-abc" in message
    assert str(conversation_id) in message
    assert "cache_key=deadbeef0000" in message
    assert "system_prompt_chars=1234" in message
