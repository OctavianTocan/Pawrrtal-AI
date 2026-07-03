/** Base provider conformance checks for selectable harness providers. */

import { assert, describe, it } from '@effect/vitest';
import type { AgentTurnId, CapabilityBoundaryId, SessionId, WorkspaceId } from '@pawrrtal/domain-core';
import { Ids } from '@pawrrtal/domain-core';
import { AgentProviderRead } from '@pawrrtal/domain-core/Modules/AgentProviders/Domain';
import { Effect, Schema, Stream } from 'effect';
import {
  DeterministicProviderConfig,
  makeDeterministicProvider,
  ProviderQueryInput,
  WorkspaceTurnSummary
} from '../src';

const workspaceId: WorkspaceId = Schema.decodeSync(Ids.workspace)('00000000-0000-4000-8000-000000000101');
const sessionId: SessionId = Schema.decodeSync(Ids.session)('00000000-0000-4000-8000-000000000102');
const turnId: AgentTurnId = Schema.decodeSync(Ids.agentTurn)('00000000-0000-4000-8000-000000000103');
const capabilityBoundaryId: CapabilityBoundaryId = Schema.decodeSync(Ids.capabilityBoundary)('base');

/** Creates the base query input used by deterministic provider conformance checks. */
const makeInput = (): ProviderQueryInput =>
  new ProviderQueryInput({
    turnId,
    sessionId,
    providerSessionId: null,
    prompt: 'hello',
    followUpBacklog: [],
    continuationFingerprint: null,
    workspace: new WorkspaceTurnSummary({
      workspaceId,
      instructionDigest: 'instruction:test',
      agentBrainDigest: 'brain:test',
      envPolicyDigest: 'env:test'
    }),
    capabilityBoundaryId,
    suppressTerminalOutputAfterCancellation: true
  });

describe('provider conformance', (): void => {
  it.effect(
    'decodes deterministic provider manifest through Schema',
    (): Effect.Effect<void> =>
      Effect.gen(function* () {
        const provider = makeDeterministicProvider(
          new DeterministicProviderConfig({ enabled: true, scenario: 'success' })
        );
        const definition = yield* provider.describe;
        const encoded = Schema.encodeSync(AgentProviderRead)(definition);

        assert.strictEqual(encoded.providerId, 'deterministic');
        assert.strictEqual(encoded.readiness, 'ready');
        assert.include(encoded.capabilities.eventTypes, 'turn.completed');
      })
  );

  it.effect(
    'runs the deterministic simple-turn sequence',
    (): Effect.Effect<void> =>
      Effect.gen(function* () {
        const provider = makeDeterministicProvider(
          new DeterministicProviderConfig({ enabled: true, scenario: 'success' })
        );
        const query = yield* provider.query(makeInput());
        const events = yield* query.events.pipe(Stream.runCollect);

        assert.deepEqual(
          events.map((event) => event.type),
          ['turn.started', 'activity', 'answer.completed', 'turn.completed']
        );
        assert.strictEqual(events[events.length - 1]?.type ?? null, 'turn.completed');
      })
  );
});
