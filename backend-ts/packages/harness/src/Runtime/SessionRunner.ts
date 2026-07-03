/** Provider query collection helpers for the first in-memory Session runner. */

import type { AgentProviderEventRead } from '@pawrrtal/domain-core/Modules/AgentTurns/Domain';
import type { Effect } from 'effect';
import { Stream } from 'effect';
import type { AgentQuery } from '../Provider/Contract';
import type { ProviderStreamError } from '../Provider/Errors';

/**
 * Collects normalized events from an accepted provider query.
 *
 * @param query - Active provider query to drain.
 * @returns Ordered normalized provider events.
 */
export function collectQueryEvents(
  query: AgentQuery
): Effect.Effect<ReadonlyArray<AgentProviderEventRead>, ProviderStreamError> {
  return Stream.runCollect(query.events);
}
