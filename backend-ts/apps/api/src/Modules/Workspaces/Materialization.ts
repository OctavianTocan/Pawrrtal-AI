/** App-owned Workspace materialization diagnostics for agent turns. */

import type { WorkspaceId } from '@pawrrtal/domain-core';
import { WorkspaceDiagnosticRead } from '@pawrrtal/domain-core/Modules/Sessions/Domain';
import { Effect } from 'effect';

/**
 * Builds the public Workspace diagnostic allowed on turn reads.
 *
 * @param workspaceId - Selected Workspace id.
 * @returns Redacted Workspace identity and materialization status.
 */
export function makeWorkspaceDiagnostic(workspaceId: WorkspaceId): Effect.Effect<WorkspaceDiagnosticRead> {
  return Effect.succeed(
    new WorkspaceDiagnosticRead({
      workspaceId,
      name: `Workspace ${workspaceId.slice(0, 8)}`,
      materializationStatus: 'resolved'
    })
  );
}
