---
name: per-agent-auth-isolation
paths: ["**/*.{ts,tsx}"]
---

# Per-Agent Auth Isolation

Each agent or service must have its own API key, scoped credentials, and isolated workspace. Never share credentials across agents. Route authentication per-agent using a cached client factory keyed by agent ID.

Shared credentials mean one compromised agent compromises all. Shared workspaces mean one agent can accidentally delete another's data. Per-agent isolation is a security boundary, not a convenience trade-off.

## Verify

"Are credentials shared between agents? Can one agent's compromise affect another? Does each agent have its own scoped API key?"

## Patterns

Bad — shared singleton client for all agents:

```typescript
// All agents use the same client — one leak exposes everything
const notionClient = new Client({ auth: process.env.NOTION_TOKEN });

export async function createPage(agentId: string, data: PageData) {
  return notionClient.pages.create(data);
  // Agent B can read Agent A's data via the same client
}
```

Good — per-agent client factory with scoped credentials:

```typescript
const clientCache = new Map<string, Client>();

function getClientForAgent(agentId: string): Client {
  if (!clientCache.has(agentId)) {
    const token = readTokenFromConfig(agentId); // e.g. ~/.config/notion/api_key_{agentId}
    clientCache.set(agentId, new Client({ auth: token }));
  }
  return clientCache.get(agentId)!;
}

export async function createPage(agentId: string, data: PageData) {
  const client = getClientForAgent(agentId);
  return client.pages.create(data);
  // Each agent's token is scoped to its own workspace
}
```

Learned from: openclaw-notion + openclaw-todoist — per-agent API key routing via `~/.config/{service}/api_key_{agentId}`.
