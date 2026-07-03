/** Recovery state checks for provider-backed Agent Turns. */

import { assert, describe, it } from '@effect/vitest';
import { isRecoverableTurnState } from '@/Modules/AgentTurns/Recovery';

describe('AgentTurns recovery', (): void => {
  it('distinguishes recoverable active states from terminal states', (): void => {
    assert.isTrue(isRecoverableTurnState('pending'));
    assert.isTrue(isRecoverableTurnState('running'));
    assert.isTrue(isRecoverableTurnState('waiting'));
    assert.isFalse(isRecoverableTurnState('complete'));
    assert.isFalse(isRecoverableTurnState('failed'));
    assert.isFalse(isRecoverableTurnState('cancelled'));
    assert.isFalse(isRecoverableTurnState('stale'));
  });
});
