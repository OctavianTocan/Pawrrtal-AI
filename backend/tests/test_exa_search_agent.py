"""Tests for the agent-loop Exa web-search adapter.

Coverage:
* ``make_exa_search_tool`` returns a correctly shaped ``AgentTool``.
* ``execute`` calls the exa_search core and formats results as Markdown.
* ``execute`` surfaces API-key-not-configured error as a string (not an
  exception) so the LLM can report gracefully.
* Tool is omitted from the Gemini provider's context when EXA_API_KEY is
  absent, and included when it is present.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.core.agent_loop.types import AgentTool
from app.core.tools.exa_search import ExaSearchResult
from app.core.tools.exa_search_agent import make_exa_search_tool


# ---------------------------------------------------------------------------
# make_exa_search_tool — shape
# ---------------------------------------------------------------------------


class TestMakeExaSearchTool:
    def test_returns_agent_tool(self) -> None:
        tool = make_exa_search_tool()
        assert isinstance(tool, AgentTool)

    def test_name_is_exa_search(self) -> None:
        tool = make_exa_search_tool()
        assert tool.name == "exa_search"

    def test_description_is_non_empty(self) -> None:
        tool = make_exa_search_tool()
        assert isinstance(tool.description, str)
        assert len(tool.description) > 20

    def test_parameters_schema_has_query(self) -> None:
        tool = make_exa_search_tool()
        props = tool.parameters.get("properties", {})
        assert "query" in props

    def test_query_is_required(self) -> None:
        tool = make_exa_search_tool()
        assert "query" in tool.parameters.get("required", [])

    def test_execute_is_callable(self) -> None:
        import asyncio

        tool = make_exa_search_tool()
        assert callable(tool.execute)


# ---------------------------------------------------------------------------
# execute — happy path
# ---------------------------------------------------------------------------


@pytest.mark.anyio
class TestExaSearchToolExecute:
    async def test_execute_calls_core_and_returns_markdown(self) -> None:
        """execute() should delegate to exa_search and format the results."""
        fake_result: ExaSearchResult = {
            "query": "python async",
            "results": [
                {
                    "title": "Real Python: asyncio",
                    "url": "https://realpython.com/async-io-python/",
                    "highlights": ["asyncio is the backbone of async Python"],
                }
            ],
            "error": None,
        }
        tool = make_exa_search_tool()
        with patch(
            "app.core.tools.exa_search_agent.exa_search",
            new=AsyncMock(return_value=fake_result),
        ):
            result = await tool.execute("dummy-id", query="python async")

        assert isinstance(result, str)
        assert "Real Python" in result
        assert "realpython.com" in result

    async def test_execute_propagates_error_as_string(self) -> None:
        """When the API key is missing the result error surfaces as a string."""
        error_result: ExaSearchResult = {
            "query": "test",
            "results": [],
            "error": "Exa API key is not configured on the server.",
        }
        tool = make_exa_search_tool()
        with patch(
            "app.core.tools.exa_search_agent.exa_search",
            new=AsyncMock(return_value=error_result),
        ):
            result = await tool.execute("dummy-id", query="test")

        assert isinstance(result, str)
        assert "not configured" in result.lower() or "failed" in result.lower()

    async def test_execute_passes_num_results(self) -> None:
        """num_results kwarg should be forwarded to the core function."""
        mock_search = AsyncMock(
            return_value={"query": "x", "results": [], "error": None}
        )
        tool = make_exa_search_tool()
        with patch("app.core.tools.exa_search_agent.exa_search", new=mock_search):
            await tool.execute("dummy-id", query="x", num_results=3)

        mock_search.assert_called_once()
        _, kwargs = mock_search.call_args
        assert kwargs.get("num_results") == 3

    async def test_execute_passes_include_full_text(self) -> None:
        """include_full_text kwarg should be forwarded to the core function."""
        mock_search = AsyncMock(
            return_value={"query": "x", "results": [], "error": None}
        )
        tool = make_exa_search_tool()
        with patch("app.core.tools.exa_search_agent.exa_search", new=mock_search):
            await tool.execute("dummy-id", query="x", include_full_text=True)

        _, kwargs = mock_search.call_args
        assert kwargs.get("include_full_text") is True

    async def test_execute_defaults_num_results_to_5(self) -> None:
        """When num_results is not supplied it should default to 5."""
        mock_search = AsyncMock(
            return_value={"query": "x", "results": [], "error": None}
        )
        tool = make_exa_search_tool()
        with patch("app.core.tools.exa_search_agent.exa_search", new=mock_search):
            await tool.execute("dummy-id", query="x")

        _, kwargs = mock_search.call_args
        assert kwargs.get("num_results") == 5


# ---------------------------------------------------------------------------
# GeminiLLM wiring — tool is included/excluded based on EXA_API_KEY
# ---------------------------------------------------------------------------


@pytest.mark.anyio
class TestGeminiToolPassthrough:
    """Gemini provider must pass caller-supplied tools through verbatim.

    Tool composition (which tools the agent gets) is the chat router's
    job — the provider is just a translator.  See
    `.claude/rules/architecture/no-tools-in-providers.md`.
    """

    async def test_provider_passes_tools_through_unchanged(self) -> None:
        import uuid

        from app.core.providers.gemini_provider import GeminiLLM

        provider = GeminiLLM("gemini-2.5-flash-preview-05-20")
        in_tools = [make_exa_search_tool()]

        captured_tools: list | None = None

        async def _fake_loop(new_messages, ctx, cfg, stream_fn):  # type: ignore[return]
            nonlocal captured_tools
            captured_tools = list(ctx.tools)
            return
            yield

        with patch(
            "app.core.providers.gemini_provider.agent_loop",
            side_effect=_fake_loop,
        ):
            async for _ in provider.stream(
                "hello",
                uuid.uuid4(),
                uuid.uuid4(),
                history=[],
                tools=in_tools,
            ):
                pass

        assert captured_tools is not None
        assert [t.name for t in captured_tools] == ["exa_search"]

    async def test_provider_does_not_inject_tools_when_caller_passes_none(self) -> None:
        import uuid

        from app.core.providers.gemini_provider import GeminiLLM

        provider = GeminiLLM("gemini-2.5-flash-preview-05-20")

        captured_tools: list | None = None

        async def _fake_loop(new_messages, ctx, cfg, stream_fn):  # type: ignore[return]
            nonlocal captured_tools
            captured_tools = list(ctx.tools)
            return
            yield

        with (
            patch("app.core.config.settings.exa_api_key", "test-key"),
            patch(
                "app.core.providers.gemini_provider.agent_loop",
                side_effect=_fake_loop,
            ),
        ):
            async for _ in provider.stream(
                "hello", uuid.uuid4(), uuid.uuid4(), history=[]
            ):
                pass

        # Even with EXA_API_KEY set, the provider must NOT inject Exa
        # — that's the chat router's job.
        assert captured_tools == []
