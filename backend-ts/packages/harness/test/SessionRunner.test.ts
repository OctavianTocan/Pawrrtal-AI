/** Active query runner checks for provider event collection. */

import { assert, describe, it } from '@effect/vitest';
import { Ids } from '@pawrrtal/domain-core';
import {
  collectQueryEvents,
  DeterministicProviderConfig,
  makeDeterministicProvider,
  ProviderQueryInput,
  WorkspaceTurnSummary
} from '@pawrrtal/harness';
import { Effect, Schema } from 'effect';

/** Creates decoded provider input for runner tests. */
function makeInput(): ProviderQueryInput {
  return new ProviderQueryInput({
    turnId: Schema.decodeSync(Ids.agentTurn)('00000000-0000-4000-8000-000000000501'),
    sessionId: Schema.decodeSync(Ids.session)('00000000-0000-4000-8000-000000000502'),
    providerSessionId: null,
    prompt: 'runner test',
    followUpBacklog: [],
    continuationFingerprint: null,
    workspace: new WorkspaceTurnSummary({
      workspaceId: Schema.decodeSync(Ids.workspace)('00000000-0000-4000-8000-000000000503'),
      instructionDigest: 'instructions',
      agentBrainDigest: 'brain',
      envPolicyDigest: 'env'
    }),
    capabilityBoundaryId: Schema.decodeSync(Ids.capabilityBoundary)('base'),
    suppressTerminalOutputAfterCancellation: true
  });
}

describe('SessionRunner', (): void => {
  it.effect(
    'collects ordered events from an accepted query',
    (): Effect.Effect<void> =>
      Effect.gen(function* () {
        const provider = makeDeterministicProvider(
          new DeterministicProviderConfig({ enabled: true, scenario: 'success' })
        );
        const query = yield* provider.query(makeInput());
        const events = yield* collectQueryEvents(query);

        assert.deepEqual(
          events.map((event) => event.type),
          ['turn.started', 'activity', 'answer.completed', 'turn.completed']
        );
      })
  );
});
