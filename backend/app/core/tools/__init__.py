"""Provider-agnostic tools that any chat provider can use.

Each tool lives in its own module with two layers:

* a pure async core function that takes plain Python args and returns a
  plain Python value — knows nothing about Claude or Gemini.
* an :class:`app.core.agent_loop.types.AgentTool` factory exposing the
  tool as a provider-neutral record (name, description, JSON-schema
  parameters, handler).  Providers translate this shape into their SDK
  format via dedicated bridges under :mod:`app.core.providers`.

Adding a new tool means adding a new module under this package and
appending its factory to ``build_agent_tools`` in
:mod:`app.core.agent_tools` — providers never need to change.
"""
