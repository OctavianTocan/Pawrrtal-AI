/** Input queue primitives for active provider turns. */

import type { Effect } from 'effect';
import { Queue } from 'effect';
import type { ProviderFollowUpInput } from '../Provider/InternalDomain';

/** Input kind accepted by a running provider turn. */
export type TurnInputQueueItem =
  | { readonly kind: 'followUp'; readonly input: ProviderFollowUpInput }
  | { readonly kind: 'endInput' };

/**
 * Creates an unbounded turn input queue for one active provider query.
 *
 * @returns Queue used by a Session runner to serialize follow-up input.
 */
export function makeTurnInputQueue(): Effect.Effect<Queue.Queue<TurnInputQueueItem>> {
  return Queue.unbounded<TurnInputQueueItem>();
}
