/** Session history maintenance decisions for long-lived agent Sessions. */

import type { AgentTurnRead } from '@pawrrtal/domain-core/Modules/AgentTurns/Domain';
import { Effect, Schema } from 'effect';

/** History action selected for one Session. */
export class HistoryMaintenanceDecision extends Schema.Class<HistoryMaintenanceDecision>('HistoryMaintenanceDecision')(
  {
    /** Whether active history remains below the maintenance threshold. */
    isWithinThreshold: Schema.Boolean,
    /** Safe summary for archived or retained turns. */
    summary: Schema.String,
    /** Count of turns that would move to the archive projection. */
    archivedTurnCount: Schema.Number,
    /** Explicit proof flag: history maintenance never stores Workspace snapshots. */
    storesWorkspaceSnapshot: Schema.Literal(false)
  },
  {
    identifier: 'HistoryMaintenanceDecision',
    title: 'HistoryMaintenanceDecision',
    description: 'Decision for maintaining long-lived Session history without Workspace snapshots.'
  }
) {}

/**
 * Builds a history maintenance decision for a Session's turns.
 *
 * @param turns - Ordered public turn history for one Session.
 * @param activeTurnLimit - Number of recent turns kept in the active projection.
 * @returns Summary/archive decision that never stores Workspace snapshots.
 */
export function maintainSessionHistory(
  turns: ReadonlyArray<AgentTurnRead>,
  activeTurnLimit: number
): Effect.Effect<HistoryMaintenanceDecision> {
  const archivedTurnCount = Math.max(0, turns.length - activeTurnLimit);
  const retained = turns.slice(archivedTurnCount);
  const summary =
    archivedTurnCount === 0
      ? `Retaining ${retained.length} active turns.`
      : `Archived ${archivedTurnCount} older turns and retained ${retained.length} active turns.`;
  return Effect.succeed(
    new HistoryMaintenanceDecision({
      isWithinThreshold: archivedTurnCount === 0,
      summary,
      archivedTurnCount,
      storesWorkspaceSnapshot: false
    })
  );
}
