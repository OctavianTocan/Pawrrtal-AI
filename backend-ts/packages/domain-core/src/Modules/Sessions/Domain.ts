/** Public Session schemas shared by Pawrrtal transports and runtimes. */

import { Schema } from 'effect';
import { Ids } from '../../Lib/TypeIds';

export const SessionStatus = Schema.Literals(['active', 'waiting', 'stale', 'failed', 'archived', 'reset']).annotate({
  identifier: 'SessionStatus',
  description: 'Lifecycle status for a provider-backed session binding.'
});

export const SessionInvocationSource = Schema.Literals(['paw-cli', 'http-api', 'rpc', 'channel']).annotate({
  identifier: 'SessionInvocationSource',
  description: 'Surface that asked Pawrrtal to run a provider-backed turn.'
});

export const WorkspaceMaterializationStatus = Schema.Literals(['resolved', 'missing', 'failed']).annotate({
  identifier: 'WorkspaceMaterializationStatus',
  description: 'Whether the selected Workspace was resolved for turn-time provider input.'
});

/** Durable user-visible session thread. */
export class SessionRead extends Schema.Class<SessionRead>('SessionRead')(
  {
    /** Stable Pawrrtal session id. */
    sessionId: Ids.session,
    /** Owner allowed to inspect and run the session. */
    ownerId: Ids.user,
    /** Workspace materialized when provider turns start. */
    workspaceId: Ids.workspace,
    /** User-visible title. */
    title: Schema.String.annotate({
      description: 'Session title shown to operator and future clients.'
    }),
    /** Optional caller route reference, represented explicitly as null when absent. */
    routeRef: Schema.NullOr(Ids.routeRef).annotate({
      description: 'Channel or caller route reference, when one owns the session route.'
    }),
    /** Creation timestamp. */
    createdAt: Schema.DateTimeUtcFromString.annotate({
      description: 'Session creation timestamp.'
    }),
    /** Last update timestamp. */
    updatedAt: Schema.DateTimeUtcFromString.annotate({
      description: 'Session last update timestamp.'
    })
  },
  {
    identifier: 'SessionRead',
    title: 'SessionRead',
    description: 'Durable Pawrrtal session thread.'
  }
) {}

/** Provider execution binding attached to a Session. */
export class AgentSessionBindingRead extends Schema.Class<AgentSessionBindingRead>('AgentSessionBindingRead')(
  {
    /** Owning session id. */
    sessionId: Ids.session,
    /** Provider selected for new turns. */
    selectedProviderId: Ids.provider,
    /** Host-owned capability policy for this session. */
    capabilityBoundaryId: Ids.capabilityBoundary,
    /** Active provider continuation record, when one exists. */
    activeProviderSessionId: Schema.NullOr(Ids.providerSession).annotate({
      description: 'Current provider-scoped continuation record, when one exists.'
    }),
    /** Binding lifecycle status. */
    status: SessionStatus,
    /** Creation timestamp. */
    createdAt: Schema.DateTimeUtcFromString.annotate({
      description: 'Binding creation timestamp.'
    }),
    /** Last update timestamp. */
    updatedAt: Schema.DateTimeUtcFromString.annotate({
      description: 'Binding last update timestamp.'
    })
  },
  {
    identifier: 'AgentSessionBindingRead',
    title: 'AgentSessionBindingRead',
    description: 'Provider and capability binding for a provider-backed Session.'
  }
) {}

/** Safe Workspace identity surfaced in diagnostics. */
export class WorkspaceDiagnosticRead extends Schema.Class<WorkspaceDiagnosticRead>('WorkspaceDiagnosticRead')(
  {
    /** Selected Workspace id. */
    workspaceId: Ids.workspace,
    /** Safe Workspace display name. */
    name: Schema.String.annotate({
      description: 'Safe Workspace display name.'
    }),
    /** Materialization state for this turn or diagnostic read. */
    materializationStatus: WorkspaceMaterializationStatus
  },
  {
    identifier: 'WorkspaceDiagnosticRead',
    title: 'WorkspaceDiagnosticRead',
    description: 'Redacted Workspace identity and materialization status.'
  }
) {}

/** Request body for creating a provider-backed Session. */
export class SessionCreateInput extends Schema.Class<SessionCreateInput>('SessionCreateInput')(
  {
    /** Workspace to bind to the new session. */
    workspaceId: Ids.workspace,
    /** Provider selected for the first turns. */
    providerId: Ids.provider,
    /** Capability boundary applied to provider turns. */
    capabilityBoundaryId: Ids.capabilityBoundary,
    /** User-visible title. */
    title: Schema.String.annotate({
      description: 'Initial session title.'
    }),
    /** Optional caller route reference, represented explicitly as null when absent. */
    routeRef: Schema.NullOr(Ids.routeRef)
  },
  {
    identifier: 'SessionCreateInput',
    title: 'SessionCreateInput',
    description: 'Payload for creating a provider-backed Session.'
  }
) {}

/** Request body for updating mutable Session metadata. */
export class SessionUpdateInput extends Schema.Class<SessionUpdateInput>('SessionUpdateInput')(
  {
    /** New user-visible title, or null to keep current title. */
    title: Schema.NullOr(Schema.String).annotate({
      description: 'New title; null keeps the current title.'
    }),
    /** New route reference, or null to keep current route reference. */
    routeRef: Schema.NullOr(Ids.routeRef).annotate({
      description: 'New route reference; null keeps the current route.'
    })
  },
  {
    identifier: 'SessionUpdateInput',
    title: 'SessionUpdateInput',
    description: 'Payload for updating Session metadata.'
  }
) {}

/** Session target for starting provider-backed work. */
export class SessionInvocationInput extends Schema.Class<SessionInvocationInput>('SessionInvocationInput')(
  {
    /** Existing session to continue, or null when creating a new session. */
    sessionId: Schema.NullOr(Ids.session),
    /** Workspace to use for a new session or explicit rebinding. */
    workspaceId: Schema.NullOr(Ids.workspace),
    /** Provider override or provider for a new session. */
    providerId: Schema.NullOr(Ids.provider),
    /** Caller surface. */
    source: SessionInvocationSource
  },
  {
    identifier: 'SessionInvocationInput',
    title: 'SessionInvocationInput',
    description: 'Resolved session invocation target for CLI, HTTP, RPC, or channel callers.'
  }
) {}
