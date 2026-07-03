/** Provider-owned continuation rotation helpers. */

import type { Effect } from 'effect';
import type { AgentProvider } from './Contract';
import type { ProviderContinuationError } from './Errors';
import type { ContinuationRotationDecision, ContinuationRotationInput } from './InternalDomain';

/**
 * Asks the provider whether its continuation can be reused.
 *
 * @param provider - Provider that owns the continuation.
 * @param input - Redacted continuation state and safe rotation reason.
 * @returns Provider-owned reuse, rotate, or reset decision.
 */
export function decideContinuationRotation(
  provider: AgentProvider,
  input: ContinuationRotationInput
): Effect.Effect<ContinuationRotationDecision, ProviderContinuationError> {
  return provider.maybeRotateContinuation(input);
}
