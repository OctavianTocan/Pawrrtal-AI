"""Tests for the provider-agnostic Exa web-search tool and its adapters.

Coverage layers:

* Core (``app.core.tools.exa_search``) — payload shape, headers, error
  branches, response normalisation, num-results clamping, and the
  Markdown formatter.
* Claude SDK adapter (``app.core.tools.exa_search_claude``) — empty-query
  guard, MCP tool ID composition, ``is_error`` propagation, MCP server
  builder.
* Agno adapter (``app.core.tools.exa_search_agno``) — Toolkit
  registration, num-results capping, async-from-sync bridge.
* ClaudeProvider wiring (``app.core.providers.claude_provider``) —
  ``enable_exa_search`` toggle gates ``mcp_servers`` and the
  whitelist entry.
* Factory routing (``app.core.providers.factory``) — ``EXA_API_KEY``
  presence flips ``ClaudeProviderConfig.enable_exa_search``.

The HTTP boundary is mocked with ``httpx.MockTransport`` so no test
ever talks to the real Exa API.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from typing import Any
from unittest.mock import patch
from uuid import uuid4

import httpx
import pytest

from app.core.providers import factory
from app.core.providers.claude_provider import ClaudeProvider, ClaudeProviderConfig
from app.core.tools.exa_search import (
    DEFAULT_NUM_RESULTS,
    EXA_API_URL,
    MAX_NUM_RESULTS,
    ExaSearchResult,
    _normalise_hit,
    exa_search,
    format_results_as_markdown,
)
from app.core.tools.exa_search_agno import ExaTools
from app.core.tools.exa_search_claude import (
    CLAUDE_TOOL_ID,
    MCP_SERVER_NAME,
    MCP_TOOL_NAME,
    _exa_search_tool,
    build_exa_mcp_server,
)

# ---------------------------------------------------------------------------
# httpx mock plumbing
# ---------------------------------------------------------------------------


def _install_mock_transport(
    monkeypatch: pytest.MonkeyPatch,
    handler: Callable[[httpx.Request], httpx.Response],
) -> list[httpx.Request]:
    """Replace ``httpx.AsyncClient`` so every request is served by ``handler``.

    Returns a list that the wrapper appends every served request to —
    tests assert on URL, headers, and JSON body via this list.
    """
    captured: list[httpx.Request] = []

    def _capturing_handler(request: httpx.Request) -> httpx.Response:
        captured.append(request)
        return handler(request)

    real_async_client = httpx.AsyncClient

    def _factory(*args: Any, **kwargs: Any) -> httpx.AsyncClient:
        kwargs.pop("transport", None)
        return real_async_client(*args, transport=httpx.MockTransport(_capturing_handler), **kwargs)

    monkeypatch.setattr("app.core.tools.exa_search.httpx.AsyncClient", _factory)
    return captured


def _ok_response(payload: dict[str, Any]) -> httpx.Response:
    return httpx.Response(200, json=payload)


def _error_response(status: int, payload: dict[str, Any] | str) -> httpx.Response:
    if isinstance(payload, str):
        return httpx.Response(status, text=payload)
    return httpx.Response(status, json=payload)


SAMPLE_HIT = {
    "title": "Hyperloop One Shut Down — IEEE Spectrum",
    "url": "https://spectrum.ieee.org/hyperloop-shutdown",
    "publishedDate": "2024-01-31T00:00:00Z",
    "author": "Evan Ackerman",
    "highlights": ["Hyperloop One has shut down operations", "after burning $450M"],
    "text": "Full text body here ...",
    "summary": "Short summary",
    # Extra fields that should be dropped on normalisation.
    "image": "https://example.com/img.png",
    "favicon": "https://example.com/favicon.ico",
    "id": "deadbeef",
    "score": 0.91,
}


# ---------------------------------------------------------------------------
# Core: configuration / no-op branches
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_missing_api_key_returns_error_without_calling_exa(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Without an EXA_API_KEY the core MUST short-circuit before any HTTP call."""
    requests = _install_mock_transport(monkeypatch, lambda _request: _ok_response({"results": []}))
    monkeypatch.setattr("app.core.tools.exa_search.settings.exa_api_key", "")

    result = await exa_search("anything")

    assert result["results"] == []
    assert result["error"] is not None
    assert "EXA_API_KEY" in result["error"]
    assert requests == [], "must not contact Exa when no key is configured"


@pytest.mark.anyio
async def test_explicit_api_key_overrides_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    """Passing ``api_key`` directly bypasses settings — used by tests / scripts."""
    monkeypatch.setattr("app.core.tools.exa_search.settings.exa_api_key", "")
    captured = _install_mock_transport(monkeypatch, lambda _r: _ok_response({"results": []}))

    result = await exa_search("hello", api_key="explicit-key")

    assert result["error"] is None
    assert len(captured) == 1
    assert captured[0].headers["x-api-key"] == "explicit-key"


# ---------------------------------------------------------------------------
# Core: request shape
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_request_targets_exa_search_with_required_headers_and_payload(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured = _install_mock_transport(monkeypatch, lambda _r: _ok_response({"results": []}))

    await exa_search("openai launches", api_key="test-key", num_results=4)

    assert len(captured) == 1
    request = captured[0]
    assert str(request.url) == EXA_API_URL
    assert request.method == "POST"
    assert request.headers["x-api-key"] == "test-key"
    assert request.headers["content-type"].startswith("application/json")

    body = json.loads(request.content)
    assert body == {
        "query": "openai launches",
        "type": "auto",
        "numResults": 4,
        "contents": {"highlights": True},
    }


@pytest.mark.anyio
async def test_include_full_text_adds_text_to_contents(monkeypatch: pytest.MonkeyPatch) -> None:
    captured = _install_mock_transport(monkeypatch, lambda _r: _ok_response({"results": []}))

    await exa_search("topic", api_key="k", include_full_text=True)

    body = json.loads(captured[0].content)
    assert body["contents"] == {"highlights": True, "text": True}


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("requested", "expected"),
    [
        (-5, 1),  # negative → clamped to 1
        (0, 1),  # zero → clamped to 1
        (DEFAULT_NUM_RESULTS, DEFAULT_NUM_RESULTS),
        (MAX_NUM_RESULTS, MAX_NUM_RESULTS),
        (MAX_NUM_RESULTS + 50, MAX_NUM_RESULTS),  # over → clamped to MAX
    ],
)
async def test_num_results_is_clamped_to_valid_range(
    monkeypatch: pytest.MonkeyPatch, requested: int, expected: int
) -> None:
    captured = _install_mock_transport(monkeypatch, lambda _r: _ok_response({"results": []}))

    await exa_search("q", api_key="k", num_results=requested)

    body = json.loads(captured[0].content)
    assert body["numResults"] == expected


# ---------------------------------------------------------------------------
# Core: response handling
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_happy_path_normalises_results_and_drops_extra_fields(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _install_mock_transport(monkeypatch, lambda _r: _ok_response({"results": [SAMPLE_HIT]}))

    result = await exa_search("q", api_key="k")

    assert result["error"] is None
    assert result["query"] == "q"
    assert len(result["results"]) == 1

    hit = result["results"][0]
    assert hit["title"] == SAMPLE_HIT["title"]
    assert hit["url"] == SAMPLE_HIT["url"]
    assert hit["published_date"] == SAMPLE_HIT["publishedDate"]
    assert hit["author"] == SAMPLE_HIT["author"]
    assert hit["highlights"] == SAMPLE_HIT["highlights"]
    assert hit["text"] == SAMPLE_HIT["text"]
    assert hit["summary"] == SAMPLE_HIT["summary"]
    # Extras must NOT leak through.
    assert "image" not in hit
    assert "favicon" not in hit
    assert "id" not in hit
    assert "score" not in hit


@pytest.mark.anyio
async def test_results_missing_returns_empty_list_without_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Exa sometimes responds without a ``results`` key — treat as no hits."""
    _install_mock_transport(monkeypatch, lambda _r: _ok_response({"requestId": "r"}))

    result = await exa_search("q", api_key="k")

    assert result == {"query": "q", "results": [], "error": None}


@pytest.mark.anyio
async def test_results_non_list_payload_is_treated_as_empty(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A malformed ``results`` field shouldn't crash the tool."""
    _install_mock_transport(monkeypatch, lambda _r: _ok_response({"results": "oops"}))

    result = await exa_search("q", api_key="k")

    assert result["results"] == []
    assert result["error"] is None


@pytest.mark.anyio
async def test_skips_non_dict_rows_in_results(monkeypatch: pytest.MonkeyPatch) -> None:
    _install_mock_transport(
        monkeypatch,
        lambda _r: _ok_response({"results": [SAMPLE_HIT, "garbage", 42, None]}),
    )

    result = await exa_search("q", api_key="k")

    assert len(result["results"]) == 1
    assert result["results"][0]["title"] == SAMPLE_HIT["title"]


# ---------------------------------------------------------------------------
# Core: error branches
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_4xx_with_json_error_body_surfaces_exa_message(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _install_mock_transport(monkeypatch, lambda _r: _error_response(401, {"error": "Bad key"}))

    result = await exa_search("q", api_key="k")

    assert result["results"] == []
    assert result["error"] is not None
    assert "401" in result["error"]
    assert "Bad key" in result["error"]


@pytest.mark.anyio
async def test_5xx_with_text_body_falls_back_to_status_text(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _install_mock_transport(monkeypatch, lambda _r: _error_response(500, "Internal Server Error"))

    result = await exa_search("q", api_key="k")

    assert "500" in (result["error"] or "")


@pytest.mark.anyio
async def test_transport_error_is_caught_and_reported(monkeypatch: pytest.MonkeyPatch) -> None:
    def _boom(_request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("dns failure")

    _install_mock_transport(monkeypatch, _boom)

    result = await exa_search("q", api_key="k")

    assert result["results"] == []
    assert result["error"] is not None
    assert "transport error" in result["error"].lower()


@pytest.mark.anyio
async def test_malformed_json_body_returns_friendly_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _install_mock_transport(monkeypatch, lambda _r: httpx.Response(200, content=b"not-json"))

    result = await exa_search("q", api_key="k")

    assert result["results"] == []
    assert "malformed" in (result["error"] or "").lower()


# ---------------------------------------------------------------------------
# Core helpers
# ---------------------------------------------------------------------------


def test_normalise_hit_handles_missing_optional_fields() -> None:
    hit = _normalise_hit({"title": "T", "url": "U"})

    assert hit["title"] == "T"
    assert hit["url"] == "U"
    assert hit["published_date"] is None
    assert hit["author"] is None
    assert hit["highlights"] == []
    assert "text" not in hit
    assert "summary" not in hit


def test_normalise_hit_drops_blank_text_and_summary() -> None:
    hit = _normalise_hit({"title": "T", "url": "U", "text": "", "summary": ""})
    assert "text" not in hit
    assert "summary" not in hit


def test_format_results_as_markdown_error_path() -> None:
    rendered = format_results_as_markdown(ExaSearchResult(query="q", results=[], error="boom"))
    assert rendered == "_Web search failed: boom_"


def test_format_results_as_markdown_empty_results() -> None:
    rendered = format_results_as_markdown(
        ExaSearchResult(query="who is alice", results=[], error=None)
    )
    assert "No web results found" in rendered
    assert '"who is alice"' in rendered


def test_format_results_as_markdown_renders_hits_with_links_and_highlights() -> None:
    rendered = format_results_as_markdown(
        ExaSearchResult(
            query="hyperloop",
            results=[_normalise_hit(SAMPLE_HIT)],
            error=None,
        )
    )

    # Title rendered as a link with the URL.
    assert f"[{SAMPLE_HIT['title']}]({SAMPLE_HIT['url']})" in rendered
    # Author + date metadata line is present.
    assert SAMPLE_HIT["author"] in rendered
    assert SAMPLE_HIT["publishedDate"] in rendered
    # Each highlight rendered as a quoted line.
    for snippet in SAMPLE_HIT["highlights"]:
        assert f"> {snippet}" in rendered


# ---------------------------------------------------------------------------
# Claude SDK adapter
# ---------------------------------------------------------------------------


def test_claude_tool_id_matches_mcp_naming_convention() -> None:
    """The whitelist entry MUST be ``mcp__<server>__<tool>`` per the SDK contract."""
    assert f"mcp__{MCP_SERVER_NAME}__{MCP_TOOL_NAME}" == CLAUDE_TOOL_ID


@pytest.mark.anyio
async def test_claude_tool_rejects_empty_query() -> None:
    response = await _exa_search_tool.handler({"query": "   "})

    assert response["is_error"] is True
    assert "non-empty" in response["content"][0]["text"]


@pytest.mark.anyio
async def test_claude_tool_returns_text_content_on_success(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _install_mock_transport(monkeypatch, lambda _r: _ok_response({"results": [SAMPLE_HIT]}))
    monkeypatch.setattr("app.core.tools.exa_search.settings.exa_api_key", "k")

    response = await _exa_search_tool.handler({"query": "hyperloop"})

    assert response.get("is_error") in (False, None)
    assert len(response["content"]) == 1
    body = response["content"][0]["text"]
    assert SAMPLE_HIT["title"] in body
    assert SAMPLE_HIT["url"] in body


@pytest.mark.anyio
async def test_claude_tool_marks_is_error_when_core_returns_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _install_mock_transport(monkeypatch, lambda _r: _error_response(429, {"error": "rate limit"}))
    monkeypatch.setattr("app.core.tools.exa_search.settings.exa_api_key", "k")

    response = await _exa_search_tool.handler({"query": "anything"})

    assert response["is_error"] is True
    assert "rate limit" in response["content"][0]["text"]


@pytest.mark.anyio
async def test_claude_tool_passes_num_results_through(monkeypatch: pytest.MonkeyPatch) -> None:
    captured = _install_mock_transport(monkeypatch, lambda _r: _ok_response({"results": []}))
    monkeypatch.setattr("app.core.tools.exa_search.settings.exa_api_key", "k")

    await _exa_search_tool.handler({"query": "q", "num_results": 7})

    body = json.loads(captured[0].content)
    assert body["numResults"] == 7


@pytest.mark.anyio
async def test_claude_tool_falls_back_to_default_num_results_for_bad_input(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured = _install_mock_transport(monkeypatch, lambda _r: _ok_response({"results": []}))
    monkeypatch.setattr("app.core.tools.exa_search.settings.exa_api_key", "k")

    await _exa_search_tool.handler({"query": "q", "num_results": "not-a-number"})

    body = json.loads(captured[0].content)
    assert body["numResults"] == DEFAULT_NUM_RESULTS


def test_build_exa_mcp_server_returns_named_config_with_one_tool() -> None:
    config = build_exa_mcp_server()
    # ``McpSdkServerConfig`` is a TypedDict-shaped mapping the SDK
    # accepts; verify the surface our provider depends on rather than
    # importing the internal type to avoid coupling to the SDK layout.
    assert isinstance(config, dict)
    assert config.get("type") == "sdk"
    assert config.get("name") == MCP_SERVER_NAME


# ---------------------------------------------------------------------------
# Agno adapter
# ---------------------------------------------------------------------------


def test_agno_toolkit_registers_exa_search() -> None:
    toolkit = ExaTools()

    # Toolkit registers callables on `.functions` keyed by name.
    assert "exa_search" in toolkit.functions


def test_agno_exa_search_returns_markdown_for_hits(monkeypatch: pytest.MonkeyPatch) -> None:
    _install_mock_transport(monkeypatch, lambda _r: _ok_response({"results": [SAMPLE_HIT]}))
    monkeypatch.setattr("app.core.tools.exa_search.settings.exa_api_key", "k")

    rendered = ExaTools().exa_search("hyperloop", num_results=3)

    assert SAMPLE_HIT["title"] in rendered
    assert SAMPLE_HIT["url"] in rendered


def test_agno_exa_search_caps_num_results_before_calling_core(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured = _install_mock_transport(monkeypatch, lambda _r: _ok_response({"results": []}))
    monkeypatch.setattr("app.core.tools.exa_search.settings.exa_api_key", "k")

    ExaTools().exa_search("q", num_results=999)

    body = json.loads(captured[0].content)
    assert body["numResults"] == MAX_NUM_RESULTS


def test_agno_exa_search_renders_error_for_missing_key(monkeypatch: pytest.MonkeyPatch) -> None:
    _install_mock_transport(monkeypatch, lambda _r: _ok_response({"results": []}))
    monkeypatch.setattr("app.core.tools.exa_search.settings.exa_api_key", "")

    rendered = ExaTools().exa_search("q")

    assert rendered.startswith("_Web search failed:")
    assert "EXA_API_KEY" in rendered


# ---------------------------------------------------------------------------
# ClaudeProvider wiring
# ---------------------------------------------------------------------------


def test_provider_options_omit_exa_when_disabled() -> None:
    provider = ClaudeProvider(
        "claude-haiku-4-5",
        config=ClaudeProviderConfig(oauth_token=None, enable_exa_search=False),
    )

    options = provider._build_options(uuid4())

    assert options.tools == []
    # When disabled, no MCP server should be wired.
    assert options.mcp_servers == {} or options.mcp_servers is None


def test_provider_options_mount_exa_mcp_server_when_enabled() -> None:
    provider = ClaudeProvider(
        "claude-haiku-4-5",
        config=ClaudeProviderConfig(oauth_token=None, enable_exa_search=True),
    )

    options = provider._build_options(uuid4())

    assert CLAUDE_TOOL_ID in (options.tools or [])
    assert MCP_SERVER_NAME in options.mcp_servers


def test_provider_options_does_not_duplicate_exa_tool_when_already_listed() -> None:
    provider = ClaudeProvider(
        "claude-haiku-4-5",
        config=ClaudeProviderConfig(
            tools=[CLAUDE_TOOL_ID],  # already in the whitelist
            oauth_token=None,
            enable_exa_search=True,
        ),
    )

    options = provider._build_options(uuid4())

    assert (options.tools or []).count(CLAUDE_TOOL_ID) == 1


# ---------------------------------------------------------------------------
# Factory routing
# ---------------------------------------------------------------------------


def test_factory_enables_exa_when_api_key_is_set() -> None:
    with patch.object(factory.settings, "exa_api_key", "ek"):
        provider = factory.resolve_provider("claude-haiku-4-5")

    # The factory only constructs ClaudeProvider for claude-* model IDs.
    assert provider.__class__.__name__ == "ClaudeProvider"
    assert provider._config.enable_exa_search is True


def test_factory_disables_exa_when_api_key_is_empty() -> None:
    with patch.object(factory.settings, "exa_api_key", ""):
        provider = factory.resolve_provider("claude-haiku-4-5")

    assert provider._config.enable_exa_search is False
