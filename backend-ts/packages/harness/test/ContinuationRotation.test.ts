/** Provider continuation rotation checks. */

import { assert, describe, it } from '@effect/vitest';
import { Ids } from '@pawrrtal/domain-core';
import { Effect, Schema } from 'effect';
import {
  ContinuationRotationInput,
  DeterministicProviderConfig,
  decideContinuationRotation,
  makeDeterministicProvider
} from '../src';

describe('ContinuationRotation', (): void => {
  it.effect(
    'uses provider-owned stale continuation decisions',
    (): Effect.Effect<void> =>
      Effect.gen(function* () {
        const provider = makeDeterministicProvider(
          new DeterministicProviderConfig({ enabled: true, scenario: 'staleContinuation' })
        );
        const decision = yield* decideContinuationRotation(
          provider,
          new ContinuationRotationInput({
            providerId: provider.providerId,
            sessionId: Schema.decodeSync(Ids.session)('00000000-0000-4000-8000-000000000701'),
            continuationFingerprint: 'deterministic:stale',
            reason: 'test stale continuation'
          })
        );

        assert.strictEqual(decision.action, 'rotate');
        assert.strictEqual(decision.nextFingerprint, 'deterministic:fresh');
      })
  );
});
