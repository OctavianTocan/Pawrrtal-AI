/** Normalized event mapping checks for deterministic provider scenarios. */

import { assert, describe, it } from '@effect/vitest';
import type { AgentTurnId, CapabilityBoundaryId, SessionId, WorkspaceId } from '@pawrrtal/domain-core';
import { Ids } from '@pawrrtal/domain-core';
import { Effect, Schema, Stream } from 'effect';
import {
  DeterministicProviderConfig,
  makeDeterministicProvider,
  ProviderQueryInput,
  WorkspaceTurnSummary
} from '../src';

const workspaceId: WorkspaceId = Schema.decodeSync(Ids.workspace)('00000000-0000-4000-8000-000000000201');
const sessionId: SessionId = Schema.decodeSync(Ids.session)('00000000-0000-4000-8000-000000000202');
const turnId: AgentTurnId = Schema.decodeSync(Ids.agentTurn)('00000000-0000-4000-8000-000000000203');
const capabilityBoundaryId: CapabilityBoundaryId = Schema.decodeSync(Ids.capabilityBoundary)('restricted');

/** Builds provider input for normalized event checks. */
const makeInput = (): ProviderQueryInput =>
  new ProviderQueryInput({
    turnId,
    sessionId,
    providerSessionId: null,
    prompt: 'need shell',
    followUpBacklog: [],
    continuationFingerprint: null,
    workspace: new WorkspaceTurnSummary({
      workspaceId,
      instructionDigest: 'instruction:restricted',
      agentBrainDigest: 'brain:restricted',
      envPolicyDigest: 'env:restricted'
    }),
    capabilityBoundaryId,
    suppressTerminalOutputAfterCancellation: true
  });

describe('event normalization', (): void => {
  it.effect(
    'surfaces capability denial as a normalized public event',
    (): Effect.Effect<void> =>
      Effect.gen(function* () {
        const provider = makeDeterministicProvider(
          new DeterministicProviderConfig({ enabled: true, scenario: 'capabilityDenied' })
        );
        const query = yield* provider.query(makeInput());
        const events = yield* query.events.pipe(Stream.runCollect);
        const denial = events.find((event) => event.type === 'capability.denied') ?? null;

        assert.isNotNull(denial);
        assert.deepEqual(
          events.map((event) => event.type),
          ['turn.started', 'capability.denied', 'turn.completed']
        );
        assert.strictEqual(denial?.visibility ?? null, 'user');
      })
  );
});
