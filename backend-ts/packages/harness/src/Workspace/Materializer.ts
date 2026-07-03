/** Workspace materialization helpers for provider turn-time context. */

import { Ids } from '@pawrrtal/domain-core';
import { Effect, Schema } from 'effect';
import { WorkspaceTurnSummary } from '../Provider/InternalDomain';

/** Input used to materialize provider-safe Workspace context. */
export class WorkspaceMaterializationInput extends Schema.Class<WorkspaceMaterializationInput>(
  'WorkspaceMaterializationInput'
)(
  {
    /** Workspace selected for this provider turn. */
    workspaceId: Ids.workspace,
    /** Capability boundary selected for this provider turn. */
    capabilityBoundaryId: Ids.capabilityBoundary
  },
  {
    identifier: 'WorkspaceMaterializationInput',
    title: 'WorkspaceMaterializationInput',
    description: 'Input used to materialize redacted Workspace context for a provider turn.'
  }
) {}

/**
 * Materializes the redacted Workspace summary visible to providers.
 *
 * @param input - Workspace and capability boundary to materialize.
 * @returns Provider-safe Workspace digest summary.
 */
export function materializeWorkspaceForTurn(input: WorkspaceMaterializationInput): Effect.Effect<WorkspaceTurnSummary> {
  return Effect.succeed(
    new WorkspaceTurnSummary({
      workspaceId: input.workspaceId,
      instructionDigest: `workspace:${input.workspaceId}:instructions`,
      agentBrainDigest: `workspace:${input.workspaceId}:brain`,
      envPolicyDigest: `workspace:${input.workspaceId}:capability:${input.capabilityBoundaryId}`
    })
  );
}
