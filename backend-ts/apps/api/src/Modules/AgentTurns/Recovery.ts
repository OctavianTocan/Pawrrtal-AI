/** Recovery helpers for provider-backed Agent Turn lifecycle states. */

import type { AgentTurnRead } from '@pawrrtal/domain-core/Modules/AgentTurns/Domain';

/**
 * Checks whether a turn state needs active-runner recovery after restart.
 *
 * @param state - Public turn state to inspect.
 * @returns Whether the state requires an active provider query.
 */
export function isRecoverableTurnState(state: AgentTurnRead['state']): boolean {
  return state === 'pending' || state === 'running' || state === 'waiting';
}
