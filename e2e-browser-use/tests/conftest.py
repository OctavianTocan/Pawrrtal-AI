"""Shared fixtures for the browser-use E2E suite.

Three things every spec needs:

1. **An authenticated browser session.** The frontend treats unauth'd
   visitors as logged-out. We hit ``POST /auth/dev-login`` on the
   FastAPI backend, capture the resulting ``session_token`` cookie,
   write a Playwright-format ``storage_state.json``, and pass it to
   ``BrowserSession(storage_state=...)`` so the page loads already
   signed in. (Per the project's API-setup-not-UI rule — no clicking
   through a login form per test.)

2. **An LLM client.** ``browser-use`` needs a model to decide each
   step. We default to ``gpt-4o-mini`` if ``OPENAI_API_KEY`` is set,
   then ``claude-haiku-4-5`` if ``ANTHROPIC_API_KEY`` is set. If
   neither key is present we skip every test in the ``browser_use``
   marker with a clear "set <X> to enable" message — running these
   tests is opt-in because they cost real money and take 10–60 s each.

3. **A configured Agent.** Builds an Agent with both of the above so
   each spec only writes the natural-language ``task=...`` plus the
   assertions on ``result``.
"""

from __future__ import annotations

import json
import os
from collections.abc import AsyncGenerator
from pathlib import Path

import httpx
import pytest
import pytest_asyncio
from browser_use import Agent, BrowserSession
from browser_use.llm import ChatAnthropic, ChatOpenAI
from browser_use.llm.base import BaseChatModel

BACKEND_URL = os.environ.get("E2E_BACKEND_URL", "http://localhost:8000")
FRONTEND_URL = os.environ.get("E2E_FRONTEND_URL", "http://localhost:3001")
HEADLESS = os.environ.get("BROWSER_USE_HEADLESS", "1") not in {"0", "false", "False"}


def _select_llm() -> BaseChatModel | None:
    """Pick an LLM based on configured env keys.

    Resolution order (first match wins):
      1. ``ZAI_API_KEY`` -> GLM-5V-Turbo via Z.AI's OpenAI-compatible
         endpoint. Multimodal coding/agent foundation model designed
         for UI-driving workflows; cheap + has a free tier.
         Vision-capable so browser-use's screenshot loop works without
         ``use_vision=False``.
      2. ``OPENAI_API_KEY``    -> gpt-4o-mini.
      3. ``ANTHROPIC_API_KEY`` -> claude-haiku-4-5.

    Returns ``None`` when no key is set so fixtures can skip the whole
    suite with an actionable message rather than failing in a confusing
    way mid-test.
    """
    if os.environ.get("ZAI_API_KEY"):
        # Z.AI exposes an OpenAI-compatible REST surface; ChatOpenAI's
        # ``base_url`` + ``api_key`` kwargs let us reuse it without a
        # new client class. Endpoint per
        # https://docs.z.ai/api-reference/llm/chat-completion.
        return ChatOpenAI(
            model="glm-5v-turbo",
            base_url="https://api.z.ai/api/paas/v4/",
            api_key=os.environ["ZAI_API_KEY"],
        )
    if os.environ.get("OPENAI_API_KEY"):
        return ChatOpenAI(model="gpt-4o-mini")
    if os.environ.get("ANTHROPIC_API_KEY"):
        return ChatAnthropic(model="claude-haiku-4-5-20251001")
    return None


@pytest.fixture(scope="session")
def base_url() -> str:
    """Frontend origin every spec navigates to."""
    return FRONTEND_URL


@pytest_asyncio.fixture(scope="session")
async def storage_state(tmp_path_factory: pytest.TempPathFactory) -> str:
    """Authenticate once per session via the dev-login endpoint.

    Reuses the same Playwright storage_state across every test in the
    session — the dev admin's session cookie is long-lived (1 h) so we
    don't need to re-auth between tests.
    """
    async with httpx.AsyncClient(base_url=BACKEND_URL, timeout=10.0) as client:
        response = await client.post("/auth/dev-login")
        if response.status_code != 200:
            raise RuntimeError(
                f"Dev login failed ({response.status_code}). "
                "Make sure ADMIN_EMAIL + ADMIN_PASSWORD are set in backend/.env "
                f"and the backend is running at {BACKEND_URL}."
            )

    cookie = response.cookies.get("session_token")
    if cookie is None:
        raise RuntimeError(
            "Dev login succeeded but no session_token cookie was returned. "
            "Has the auth backend been changed to a non-cookie transport?"
        )

    state = {
        "cookies": [
            {
                "name": "session_token",
                "value": cookie,
                "domain": "localhost",
                "path": "/",
                "httpOnly": True,
                "secure": False,
                "sameSite": "Lax",
            }
        ],
        "origins": [],
    }
    path: Path = tmp_path_factory.mktemp("auth") / "storage_state.json"
    path.write_text(json.dumps(state))
    return str(path)


@pytest.fixture(scope="session")
def llm() -> BaseChatModel:
    """Resolve the LLM or skip the entire suite with an actionable message."""
    model = _select_llm()
    if model is None:
        pytest.skip(
            "browser-use tests need an LLM. Set one of: "
            "ZAI_API_KEY (recommended -> GLM-5V-Turbo, has a free tier), "
            "OPENAI_API_KEY (-> gpt-4o-mini), or "
            "ANTHROPIC_API_KEY (-> claude-haiku-4-5).",
            allow_module_level=False,
        )
    return model


@pytest_asyncio.fixture
async def browser(storage_state: str) -> AsyncGenerator[BrowserSession]:
    """Per-test BrowserSession with the dev-admin cookie pre-loaded.

    Function-scoped (not session-scoped) so each test gets a clean
    page state — agents can mutate the DOM in arbitrary ways and we
    don't want bleed-through.
    """
    session = BrowserSession(
        headless=HEADLESS,
        storage_state=storage_state,
        allowed_domains=["localhost"],
    )
    await session.start()
    try:
        yield session
    finally:
        await session.stop()


@pytest_asyncio.fixture
async def agent_factory(browser: BrowserSession, llm: BaseChatModel):
    """Returns a callable that builds an Agent with both fixtures wired in.

    Each spec calls ``await agent_factory("Open …, then …").run()``
    rather than instantiating Agent directly, so the LLM + browser
    plumbing stays in one place.
    """

    def _build(task: str, **kwargs: object) -> Agent:
        return Agent(task=task, llm=llm, browser_session=browser, **kwargs)

    return _build
