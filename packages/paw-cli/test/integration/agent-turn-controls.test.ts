import { describe, expect, it } from 'vitest';
import { runCli } from './harness';

const sessionId = '00000000-0000-4000-8000-000000000411';
const turnId = '00000000-0000-4000-8000-000000000412';
const providerSessionId = '00000000-0000-4000-8000-000000000413';
const messageId = '00000000-0000-4000-8000-000000000414';
const createdAt = '2026-07-03T00:00:00.000Z';

describe('agent turn control CLI commands', (): void => {
  it('follows events until terminal state through the configured backend target', async (): Promise<void> => {
    const server = makeTurnControlServer();
    try {
      const result = await runCli({
        args: ['--backend-url', server.url, 'sessions', 'events', sessionId, turnId, '--follow', '--json'],
      });

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual(eventPayloads);
    } finally {
      server.stop();
    }
  });

  it('requests turn cancellation through the configured backend target', async (): Promise<void> => {
    const server = makeTurnControlServer();
    try {
      const result = await runCli({
        args: [
          '--backend-url',
          server.url,
          'sessions',
          'cancel-turn',
          sessionId,
          turnId,
          '--reason',
          'operator',
          '--json',
        ],
      });

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({ ...turnPayload, state: 'cancelled' });
    } finally {
      server.stop();
    }
  });
});

/** Starts a Bun server that implements the minimal turn-control surface. */
function makeTurnControlServer(): { readonly url: string; readonly stop: () => void } {
  const server = Bun.serve({
    port: 0,
    fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === `/api/v1/sessions/${sessionId}/agent-turns/${turnId}` && request.method === 'GET') {
        return json(turnPayload);
      }
      if (url.pathname === `/api/v1/sessions/${sessionId}/agent-turns/${turnId}/events` && request.method === 'GET') {
        return json(eventPayloads);
      }
      if (url.pathname === `/api/v1/sessions/${sessionId}/agent-turns/${turnId}/cancel` && request.method === 'POST') {
        return json({ ...turnPayload, state: 'cancelled' });
      }

      return new Response('not found', { status: 404 });
    },
  });

  return {
    url: `http://${server.hostname}:${server.port}`,
    stop: () => server.stop(true),
  };
}

/** Serializes a JSON response for the mock backend. */
function json(payload: JsonValue): Response {
  return Response.json(payload, { headers: { 'content-type': 'application/json' } });
}

type JsonValue = null | boolean | number | string | ReadonlyArray<JsonValue> | { readonly [key: string]: JsonValue };

const turnPayload = {
  turnId,
  sessionId,
  providerId: 'deterministic',
  providerSessionId,
  workspace: {
    workspaceId: '00000000-0000-4000-8000-000000000414',
    name: 'Workspace 00000000',
    materializationStatus: 'resolved',
  },
  inputMessageId: messageId,
  state: 'complete',
  sequence: 1,
  lastProgressAt: createdAt,
  failure: null,
  createdAt,
  startedAt: createdAt,
  finishedAt: createdAt,
} as const satisfies JsonValue;

const eventPayloads = [
  {
    eventId: '00000000-0000-4000-8000-000000000415',
    turnId,
    sequence: 1,
    type: 'turn.started',
    visibility: 'operator',
    payload: { text: 'started' },
    createdAt,
  },
  {
    eventId: '00000000-0000-4000-8000-000000000416',
    turnId,
    sequence: 2,
    type: 'turn.completed',
    visibility: 'user',
    payload: { text: 'done' },
    createdAt,
  },
] as const satisfies JsonValue;
