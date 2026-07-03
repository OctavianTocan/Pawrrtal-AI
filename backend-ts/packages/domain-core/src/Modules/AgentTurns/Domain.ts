/** Public Agent Turn and event schemas shared by Pawrrtal transports and runtimes. */

import { Schema } from 'effect';
import { Ids } from '../../Lib/TypeIds';
import { WorkspaceDiagnosticRead } from '../Sessions/Domain';

export const AgentTurnState = Schema.Literals([
  'pending',
  'running',
  'waiting',
  'complete',
  'failed',
  'cancelled',
  'stale'
]).annotate({
  identifier: 'AgentTurnState',
  description: 'Public lifecycle state for one provider-backed turn.'
});

export const AgentProviderEventType = Schema.Literals([
  'turn.started',
  'progress',
  'activity',
  'tool.started',
  'tool.completed',
  'tool.failed',
  'capability.denied',
  'diagnostic',
  'continuation.rotated',
  'error',
  'answer.delta',
  'answer.completed',
  'turn.cancelled',
  'turn.completed'
]).annotate({
  identifier: 'AgentProviderEventType',
  description: 'Canonical normalized provider event name.'
});

export const AgentProviderEventVisibility = Schema.Literals(['user', 'operator', 'internal']).annotate({
  identifier: 'AgentProviderEventVisibility',
  description: 'Audience that may consume a normalized event.'
});

export const ProviderSessionStatus = Schema.Literals(['active', 'rotated', 'stale', 'invalid', 'closed']).annotate({
  identifier: 'ProviderSessionStatus',
  description: 'Provider-scoped continuation lifecycle state.'
});

export const ProviderResumeMode = Schema.Literals(['native', 'rotationOnly', 'unsupported']).annotate({
  identifier: 'ProviderResumeMode',
  description: 'Provider continuation support mode.'
});

export const CapabilityDecision = Schema.Literals(['allowed', 'denied', 'unsupported']).annotate({
  identifier: 'CapabilityDecision',
  description: 'Host-owned decision for one capability in a Workspace or Session.'
});

/** One capability decision in the host-owned capability boundary. */
export class CapabilityDecisionRead extends Schema.Class<CapabilityDecisionRead>('CapabilityDecisionRead')(
  {
    /** Stable capability id. */
    capabilityId: Ids.capability,
    /** Allowed, denied, or unsupported decision. */
    decision: CapabilityDecision,
    /** Safe explanation for operators and clients. */
    reason: Schema.String.annotate({
      description: 'Safe explanation for this capability decision.'
    })
  },
  {
    identifier: 'CapabilityDecisionRead',
    title: 'CapabilityDecisionRead',
    description: 'Host-owned capability decision.'
  }
) {}

/** Public provider-scoped continuation record. */
export class ProviderSessionRead extends Schema.Class<ProviderSessionRead>('ProviderSessionRead')(
  {
    /** Provider-scoped continuation record id. */
    providerSessionId: Ids.providerSession,
    /** Owning Pawrrtal session id. */
    sessionId: Ids.session,
    /** Provider that owns this continuation. */
    providerId: Ids.provider,
    /** Redacted continuation fingerprint. */
    continuationFingerprint: Schema.String.annotate({
      description: 'Redacted continuation fingerprint, never the raw continuation value.'
    }),
    /** Resume support mode. */
    resumeMode: ProviderResumeMode,
    /** Continuation lifecycle status. */
    status: ProviderSessionStatus,
    /** Last provider activity timestamp. */
    lastActivityAt: Schema.NullOr(Schema.DateTimeUtcFromString).annotate({
      description: 'Last provider activity timestamp.'
    }),
    /** Reason a fresh provider continuation was started. */
    rotationReason: Schema.NullOr(Schema.String).annotate({
      description: 'Safe reason for continuation rotation.'
    }),
    /** Timestamp when resume stopped being safe. */
    invalidatedAt: Schema.NullOr(Schema.DateTimeUtcFromString).annotate({
      description: 'Timestamp when the continuation was invalidated.'
    })
  },
  {
    identifier: 'ProviderSessionRead',
    title: 'ProviderSessionRead',
    description: 'Public provider-scoped continuation summary.'
  }
) {}

/** Safe failure summary attached to a turn. */
export class AgentTurnFailureRead extends Schema.Class<AgentTurnFailureRead>('AgentTurnFailureRead')(
  {
    /** Stable failure code. */
    code: Schema.String.annotate({
      description: 'Stable failure code.'
    }),
    /** Safe failure message. */
    message: Schema.String.annotate({
      description: 'Safe failure message.'
    }),
    /** Safe next action for users or operators. */
    safeNextAction: Schema.NullOr(Schema.String).annotate({
      description: 'Safe next action when one is available.'
    })
  },
  {
    identifier: 'AgentTurnFailureRead',
    title: 'AgentTurnFailureRead',
    description: 'Safe failure summary for a provider-backed turn.'
  }
) {}

/** Public state for one provider-backed turn. */
export class AgentTurnRead extends Schema.Class<AgentTurnRead>('AgentTurnRead')(
  {
    /** Stable turn id. */
    turnId: Ids.agentTurn,
    /** Owning session id. */
    sessionId: Ids.session,
    /** Provider selected for this turn. */
    providerId: Ids.provider,
    /** Provider continuation record used by this turn. */
    providerSessionId: Schema.NullOr(Ids.providerSession),
    /** Redacted Workspace identity and materialization status for this turn. */
    workspace: WorkspaceDiagnosticRead,
    /** Source user message id. */
    inputMessageId: Ids.message,
    /** Public turn lifecycle state. */
    state: AgentTurnState,
    /** Monotonic turn order inside the session. */
    sequence: Schema.Number.annotate({
      description: 'Monotonic turn order inside the session.'
    }),
    /** Last normalized progress or activity timestamp. */
    lastProgressAt: Schema.NullOr(Schema.DateTimeUtcFromString),
    /** Safe failure summary, when the turn failed or became stale. */
    failure: Schema.NullOr(AgentTurnFailureRead),
    /** Turn creation timestamp. */
    createdAt: Schema.DateTimeUtcFromString,
    /** Turn start timestamp. */
    startedAt: Schema.NullOr(Schema.DateTimeUtcFromString),
    /** Turn finish timestamp. */
    finishedAt: Schema.NullOr(Schema.DateTimeUtcFromString)
  },
  {
    identifier: 'AgentTurnRead',
    title: 'AgentTurnRead',
    description: 'Public provider-backed turn state.'
  }
) {}

/** Request body for starting a provider-backed turn. */
export class AgentTurnCreateInput extends Schema.Class<AgentTurnCreateInput>('AgentTurnCreateInput')(
  {
    /** Session invocation target fields. */
    sessionId: Schema.NullOr(Ids.session),
    /** Workspace required for a new session. */
    workspaceId: Schema.NullOr(Ids.workspace),
    /** Provider override or provider for a new session. */
    providerId: Schema.NullOr(Ids.provider),
    /** User prompt for this turn. */
    message: Schema.String.annotate({
      description: 'User prompt for the provider-backed turn.'
    })
  },
  {
    identifier: 'AgentTurnCreateInput',
    title: 'AgentTurnCreateInput',
    description: 'Payload for starting or queueing a provider-backed turn.'
  }
) {}

/** Request body for sending follow-up input to a turn. */
export class AgentFollowUpInput extends Schema.Class<AgentFollowUpInput>('AgentFollowUpInput')(
  {
    /** Follow-up message for the active turn. */
    message: Schema.String.annotate({
      description: 'Follow-up message for the active turn.'
    })
  },
  {
    identifier: 'AgentFollowUpInput',
    title: 'AgentFollowUpInput',
    description: 'Payload for follow-up input during a provider turn.'
  }
) {}

/** Request body for cancelling a provider-backed turn. */
export class AgentCancellationInput extends Schema.Class<AgentCancellationInput>('AgentCancellationInput')(
  {
    /** Safe cancellation reason. */
    reason: Schema.NullOr(Schema.String).annotate({
      description: 'Safe cancellation reason.'
    })
  },
  {
    identifier: 'AgentCancellationInput',
    title: 'AgentCancellationInput',
    description: 'Payload for requesting turn cancellation.'
  }
) {}

/** Simple normalized text payload. */
export class TextEventPayload extends Schema.Class<TextEventPayload>('TextEventPayload')(
  {
    /** Event text. */
    text: Schema.String
  },
  {
    identifier: 'TextEventPayload',
    title: 'TextEventPayload',
    description: 'Normalized text event payload.'
  }
) {}

/** Normalized capability denial payload. */
export class CapabilityDeniedEventPayload extends Schema.Class<CapabilityDeniedEventPayload>(
  'CapabilityDeniedEventPayload'
)(
  {
    /** Capability that was denied or unsupported. */
    capabilityId: Ids.capability,
    /** Capability decision. */
    decision: CapabilityDecision,
    /** Safe reason. */
    reason: Schema.String,
    /** Safe next action. */
    safeNextAction: Schema.NullOr(Schema.String)
  },
  {
    identifier: 'CapabilityDeniedEventPayload',
    title: 'CapabilityDeniedEventPayload',
    description: 'Normalized capability denial payload.'
  }
) {}

/** Normalized diagnostic payload. */
export class DiagnosticEventPayload extends Schema.Class<DiagnosticEventPayload>('DiagnosticEventPayload')(
  {
    /** Redacted diagnostic summary. */
    summary: Schema.String,
    /** Whether the diagnostic was redacted. */
    isRedacted: Schema.Boolean
  },
  {
    identifier: 'DiagnosticEventPayload',
    title: 'DiagnosticEventPayload',
    description: 'Redacted operator diagnostic payload.'
  }
) {}

/** Normalized provider continuation rotation payload. */
export class ContinuationRotatedEventPayload extends Schema.Class<ContinuationRotatedEventPayload>(
  'ContinuationRotatedEventPayload'
)(
  {
    /** Safe rotation reason. */
    reason: Schema.String,
    /** Previous redacted continuation fingerprint. */
    previousFingerprint: Schema.NullOr(Schema.String),
    /** New redacted continuation fingerprint. */
    nextFingerprint: Schema.NullOr(Schema.String)
  },
  {
    identifier: 'ContinuationRotatedEventPayload',
    title: 'ContinuationRotatedEventPayload',
    description: 'Normalized continuation rotation payload.'
  }
) {}

export const AgentProviderEventPayload = Schema.Union([
  TextEventPayload,
  CapabilityDeniedEventPayload,
  DiagnosticEventPayload,
  ContinuationRotatedEventPayload,
  AgentTurnFailureRead
]).annotate({
  identifier: 'AgentProviderEventPayload',
  description: 'Decoded normalized event payload.'
});

/** Normalized event emitted during a provider-backed turn. */
export class AgentProviderEventRead extends Schema.Class<AgentProviderEventRead>('AgentProviderEventRead')(
  {
    /** Stable event id. */
    eventId: Ids.event,
    /** Owning turn id. */
    turnId: Ids.agentTurn,
    /** Monotonic sequence within the turn. */
    sequence: Schema.Number,
    /** Canonical normalized event type. */
    type: AgentProviderEventType,
    /** Event visibility. */
    visibility: AgentProviderEventVisibility,
    /** Decoded normalized payload. */
    payload: AgentProviderEventPayload,
    /** Event timestamp. */
    createdAt: Schema.DateTimeUtcFromString
  },
  {
    identifier: 'AgentProviderEventRead',
    title: 'AgentProviderEventRead',
    description: 'Normalized provider event visible through public Pawrrtal contracts.'
  }
) {}
