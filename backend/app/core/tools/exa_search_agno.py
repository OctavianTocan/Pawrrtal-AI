"""Agno adapter for the Exa web-search tool.

Wraps the shared core in :mod:`app.core.tools.exa_search` as an Agno
:class:`Toolkit` so it can be appended to any Agent's ``tools=[...]``
list — Agno auto-introspects the registered method signatures and
generates the function-calling schema for Gemini / OpenAI / etc.
"""

from __future__ import annotations

import asyncio
import uuid

from agno.tools.toolkit import Toolkit

from app.core.providers.keys import resolve_api_key

from .exa_search import (
    DEFAULT_NUM_RESULTS,
    MAX_NUM_RESULTS,
    exa_search,
    format_results_as_markdown,
)


class ExaTools(Toolkit):
    """Agno toolkit exposing a single ``exa_search`` capability.

    The registered method signature (``query: str``, ``num_results: int``)
    is what Agno serialises into the model's function-call schema, so the
    parameter docstring is intentionally rich — it is what Gemini sees.
    """

    def __init__(self, *, user_id: uuid.UUID | None = None) -> None:
        super().__init__(name="ExaTools", tools=[self.exa_search])
        self._user_id = user_id

    def exa_search(self, query: str, num_results: int = DEFAULT_NUM_RESULTS) -> str:
        """Search the public web through Exa.

        Use this whenever the user asks for fresh information, current
        events, citations, or anything that requires going beyond your
        training data. Always cite the URLs returned by this tool when
        you incorporate the results.

        Args:
            query: Natural-language search query. Long, semantically
                rich descriptions work best — Exa is a neural search
                engine, not a keyword one.
            num_results: How many results to return. Defaults to
                ``DEFAULT_NUM_RESULTS``; capped at ``MAX_NUM_RESULTS``
                inside the core to keep token usage bounded.

        Returns:
            A Markdown-formatted summary of the search results, ready
            for the model to quote. Errors render as a single italic
            line so the model can apologise gracefully.
        """
        capped = max(1, min(num_results, MAX_NUM_RESULTS))
        api_key = None
        if self._user_id:
            api_key = resolve_api_key(self._user_id, "EXA_API_KEY")
        # Agno's ``agent.run(stream=True)`` already runs in a worker
        # thread (see ``AgnoProvider``), so spinning a private event
        # loop here is the cleanest way to call the async core without
        # leaking back into the calling thread's loop.
        result = asyncio.run(exa_search(query, num_results=capped, api_key=api_key))
        return format_results_as_markdown(result)
