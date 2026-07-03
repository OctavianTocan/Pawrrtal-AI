/** Provider-private schemas decoded at the harness boundary before adapter work starts. */

import { Ids } from '@pawrrtal/domain-core';
import { Schema } from 'effect';

export const DeterministicProviderScenario = Schema.Literals([
  'success',
  'cancellation',
  'capabilityDenied',
  'unsupportedCapability',
  'staleContinuation',
  'failure'
]).annotate({
  identifier: 'DeterministicProviderScenario',
  description: 'Deterministic provider behavior selected for conformance and CI runs.'
});

export const ContinuationRotationAction = Schema.Literals(['reuse', 'rotate', 'reset']).annotate({
  identifier: 'ContinuationRotationAction',
  description: 'Provider decision for a provider-scoped continuation.'
});

/** Redacted Workspace summary materialized for one provider turn. */
export class WorkspaceTurnSummary extends Schema.Class<WorkspaceTurnSummary>('WorkspaceTurnSummary')(
  {
    /** Workspace that owns instructions, memory, skills, tools, and policy for this turn. */
    workspaceId: Ids.workspace,
    /** Redacted digest for materialized instructions. */
    instructionDigest: Schema.String.annotate({
      description: 'Redacted digest for materialized instructions.'
    }),
    /** Redacted digest for memory and skill materialization. */
    agentBrainDigest: Schema.String.annotate({
      description: 'Redacted digest for materialized agent brain state.'
    }),
    /** Redacted digest for environment and secret policy. */
    envPolicyDigest: Schema.String.annotate({
      description: 'Redacted digest for environment and secret policy.'
    })
  },
  {
    identifier: 'WorkspaceTurnSummary',
    title: 'WorkspaceTurnSummary',
    description: 'Provider-safe Workspace summary for one turn.'
  }
) {}

/** Provider input decoded before a provider accepts a turn. */
export class ProviderQueryInput extends Schema.Class<ProviderQueryInput>('ProviderQueryInput')(
  {
    /** Turn receiving normalized provider events. */
    turnId: Ids.agentTurn,
    /** Pawrrtal session that owns this turn. */
    sessionId: Ids.session,
    /** Provider-scoped continuation record for this turn. */
    providerSessionId: Schema.NullOr(Ids.providerSession),
    /** User prompt for the provider. */
    prompt: Schema.String.annotate({
      description: 'User prompt for the provider.'
    }),
    /** Follow-up messages queued before provider start. */
    followUpBacklog: Schema.Array(Schema.String).annotate({
      description: 'Follow-up messages queued before provider start.'
    }),
    /** Redacted continuation fingerprint from the selected provider. */
    continuationFingerprint: Schema.NullOr(Schema.String).annotate({
      description: 'Redacted provider continuation fingerprint.'
    }),
    /** Workspace whose materialized state is visible to the provider. */
    workspace: WorkspaceTurnSummary,
    /** Host-owned capability boundary for this turn. */
    capabilityBoundaryId: Ids.capabilityBoundary,
    /** Whether the provider should suppress terminal output after cancellation. */
    suppressTerminalOutputAfterCancellation: Schema.Boolean
  },
  {
    identifier: 'ProviderQueryInput',
    title: 'ProviderQueryInput',
    description: 'Decoded provider turn input.'
  }
) {}

/** Follow-up input delivered to an active provider query. */
export class ProviderFollowUpInput extends Schema.Class<ProviderFollowUpInput>('ProviderFollowUpInput')(
  {
    /** Follow-up text. */
    message: Schema.String
  },
  {
    identifier: 'ProviderFollowUpInput',
    title: 'ProviderFollowUpInput',
    description: 'Follow-up input delivered through the provider query.'
  }
) {}

/** Cancellation reason delivered to an active provider query. */
export class ProviderCancellationReason extends Schema.Class<ProviderCancellationReason>('ProviderCancellationReason')(
  {
    /** Safe cancellation reason. */
    reason: Schema.String
  },
  {
    identifier: 'ProviderCancellationReason',
    title: 'ProviderCancellationReason',
    description: 'Provider-safe cancellation reason.'
  }
) {}

/** Input used when deciding whether a continuation must rotate. */
export class ContinuationRotationInput extends Schema.Class<ContinuationRotationInput>('ContinuationRotationInput')(
  {
    /** Provider that owns the current continuation. */
    providerId: Ids.provider,
    /** Pawrrtal session that owns the continuation. */
    sessionId: Ids.session,
    /** Redacted continuation fingerprint. */
    continuationFingerprint: Schema.NullOr(Schema.String),
    /** Safe reason for checking rotation. */
    reason: Schema.String
  },
  {
    identifier: 'ContinuationRotationInput',
    title: 'ContinuationRotationInput',
    description: 'Decoded continuation rotation input.'
  }
) {}

/** Provider continuation decision after stale-session checks. */
export class ContinuationRotationDecision extends Schema.Class<ContinuationRotationDecision>(
  'ContinuationRotationDecision'
)(
  {
    /** Rotation action selected by the provider. */
    action: ContinuationRotationAction,
    /** Safe provider explanation. */
    reason: Schema.String,
    /** Next redacted continuation fingerprint when known. */
    nextFingerprint: Schema.NullOr(Schema.String)
  },
  {
    identifier: 'ContinuationRotationDecision',
    title: 'ContinuationRotationDecision',
    description: 'Provider continuation rotation decision.'
  }
) {}

export type DeterministicProviderScenarioValue = Schema.Schema.Type<typeof DeterministicProviderScenario>;
