---
# ai-nexus-5ljp
title: Build MCP server manager
status: scrapped
type: task
priority: normal
tags:
    - Sprint-E
    - backend
created_at: 2026-02-27T16:10:03Z
updated_at: 2026-03-07T22:25:08Z
parent: ai-nexus-sady
---

Create app/core/mcp/manager.py. Start/stop MCP servers as subprocesses. Route tool calls to correct server. Config-driven server registry.

## Reasons for Scrapping

Agno's MCPTools already handles MCP server connections and tool call routing. Custom subprocess manager is unnecessary duplication.
