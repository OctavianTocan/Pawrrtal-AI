import { describe, expect, it } from 'vitest';
import { runCli } from './harness';

const sessionId = '00000000-0000-4000-8000-000000000401';
const turnId = '00000000-0000-4000-8000-000000000402';
const providerSessionId = '00000000-0000-4000-8000-000000000403';
const messageId = '00000000-0000-4000-8000-000000000404';
const firstEventId = '00000000-0000-4000-8000-000000000405';
const secondEventId = '00000000-0000-4000-8000-000000000406';
const createdAt = '2026-07-03T00:00:00.000Z';

describe('agent session CLI commands', (): void => {
  it('lists providers through the configured backend target', async (): Promise<void> => {
    const server = makeAgentSessionServer();
    try {
      const result = await runCli({
        args: ['--backend-url', server.url, 'providers', 'list', '--json']
      });

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([providerPayload]);
    } finally {
      server.stop();
    }
  });

  it('sends a Session turn and reads normalized events through Bun HTTP', async (): Promise<void> => {
    const server = makeAgentSessionServer();
    try {
      const send = await runCli({
        args: ['--backend-url', server.url, 'sessions', 'send', sessionId, 'hello', '--json']
      });
      const events = await runCli({
        args: ['--backend-url', server.url, 'sessions', 'events', sessionId, turnId, '--json']
      });

      expect(send.exitCode).toBe(0);
      expect(JSON.parse(send.stdout)).toEqual(turnPayload);
      expect(events.exitCode).toBe(0);
      expect(JSON.parse(events.stdout)).toEqual(eventPayloads);
    } finally {
      server.stop();
    }
  });
});

/** Starts a Bun server that implements the minimal public session-engine surface. */
function makeAgentSessionServer(): { readonly url: string; readonly stop: () => void } {
  const server = Bun.serve({
    port: 0,
    fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === '/api/v1/agent-providers/' && request.method === 'GET') {
        return json([providerPayload]);
      }
      if (url.pathname === `/api/v1/sessions/${sessionId}/agent-turns/` && request.method === 'POST') {
        return json(turnPayload);
      }
      if (url.pathname === `/api/v1/sessions/${sessionId}/agent-turns/${turnId}/events` && request.method === 'GET') {
        return json(eventPayloads);
      }

      return new Response('not found', { status: 404 });
    }
  });

  return {
    url: `http://${server.hostname}:${server.port}`,
    stop: () => server.stop(true)
  };
}

/** Serializes a JSON response for the mock backend. */
function json(payload: JsonValue): Response {
  return Response.json(payload, { headers: { 'content-type': 'application/json' } });
}

type JsonValue = null | boolean | number | string | ReadonlyArray<JsonValue> | { readonly [key: string]: JsonValue };

const providerPayload = {
  providerId: 'deterministic',
  displayName: 'Deterministic Provider',
  kind: 'deterministic',
  version: '0.1.0',
  readiness: 'ready',
  capabilities: {
    streaming: true,
    followUps: 'nextTurnOnly',
    cancellation: 'bestEffort',
    resume: 'rotationOnly',
    nativeSlashCommands: false,
    tools: 'host',
    userQuestions: 'hostMediated',
    workspaceInjection: ['systemPrompt'],
    eventTypes: ['turn.started', 'activity', 'answer.completed', 'turn.completed']
  },
  continuation: 'rotationOnly',
  setupRequirements: [],
  diagnostics: []
} as const satisfies JsonValue;

const turnPayload = {
  turnId,
  sessionId,
  providerId: 'deterministic',
  providerSessionId,
  workspace: {
    workspaceId: '00000000-0000-4000-8000-000000000404',
    name: 'Workspace 00000000',
    materializationStatus: 'resolved'
  },
  inputMessageId: messageId,
  state: 'complete',
  sequence: 1,
  lastProgressAt: createdAt,
  failure: null,
  createdAt,
  startedAt: createdAt,
  finishedAt: createdAt
} as const satisfies JsonValue;

const eventPayloads = [
  {
    eventId: firstEventId,
    turnId,
    sequence: 1,
    type: 'turn.started',
    visibility: 'operator',
    payload: { text: 'started' },
    createdAt
  },
  {
    eventId: secondEventId,
    turnId,
    sequence: 2,
    type: 'turn.completed',
    visibility: 'user',
    payload: { text: 'done' },
    createdAt
  }
] as const satisfies JsonValue;
