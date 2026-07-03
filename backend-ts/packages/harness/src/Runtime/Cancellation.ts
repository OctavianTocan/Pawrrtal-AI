/** Cancellation helpers for active provider queries. */

import type { Effect } from 'effect';
import type { AgentQuery } from '../Provider/Contract';
import type { ProviderCancellationError } from '../Provider/Errors';
import type { ProviderCancellationReason } from '../Provider/InternalDomain';

/**
 * Requests provider cancellation through the active query handle.
 *
 * @param query - Active provider query to cancel.
 * @param reason - Safe cancellation reason.
 */
export function cancelActiveQuery(
  query: AgentQuery,
  reason: ProviderCancellationReason
): Effect.Effect<void, ProviderCancellationError> {
  return query.abort(reason);
}
