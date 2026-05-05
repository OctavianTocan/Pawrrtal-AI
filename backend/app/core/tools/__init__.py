"""Provider-agnostic tools that any chat backend (Claude SDK / Agno / future) can use.

Each tool lives in its own module with three layers:

* a pure async core function that takes plain Python args and returns a
  plain Python value — knows nothing about Claude or Agno.
* a Claude Agent SDK wrapper (``@tool`` decorator + ``create_sdk_mcp_server``)
  exposed as a builder so the provider can mount it on demand.
* an Agno wrapper (``Toolkit`` subclass) registered with the agent.

Adding a new tool means adding a new module under this package and wiring
it into both providers — never duplicating the network logic across them.
"""
