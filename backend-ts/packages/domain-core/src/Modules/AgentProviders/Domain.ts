/** Public Agent Provider schemas shared by transports, harness, and app services. */

import { Schema } from 'effect';
import { Ids } from '../../Lib/TypeIds';

export const ProviderKind = Schema.Literals(['sdk', 'cli', 'hosted', 'local', 'deterministic']).annotate({
  identifier: 'ProviderKind',
  description: 'Runtime family used by an Agent Provider.'
});

export const ProviderReadiness = Schema.Literals([
  'ready',
  'degraded',
  'missingSetup',
  'unauthorized',
  'unavailable'
]).annotate({
  identifier: 'ProviderReadiness',
  description: 'Cheap provider readiness result.'
});

export const ProviderFollowUpSupport = Schema.Literals(['activeTurn', 'nextTurnOnly', 'unsupported']).annotate({
  identifier: 'ProviderFollowUpSupport',
  description: 'How the provider accepts user input during an active turn.'
});

export const ProviderCancellationSupport = Schema.Literals(['native', 'bestEffort', 'unsupported']).annotate({
  identifier: 'ProviderCancellationSupport',
  description: 'How the provider handles cancellation.'
});

export const ProviderResumeSupport = Schema.Literals(['native', 'rotationOnly', 'unsupported']).annotate({
  identifier: 'ProviderResumeSupport',
  description: 'How the provider handles session continuation.'
});

export const ProviderToolEnforcement = Schema.Literals(['host', 'provider', 'none']).annotate({
  identifier: 'ProviderToolEnforcement',
  description: 'Where tool capability enforcement happens.'
});

export const ProviderUserQuestionMode = Schema.Literals(['hostMediated', 'blocked', 'unsupported']).annotate({
  identifier: 'ProviderUserQuestionMode',
  description: 'How provider-native user questions are handled in headless Pawrrtal sessions.'
});

export const WorkspaceInjectionMode = Schema.Literals([
  'systemPrompt',
  'files',
  'mcp',
  'providerNative',
  'none'
]).annotate({
  identifier: 'WorkspaceInjectionMode',
  description: 'How materialized Workspace state is supplied to the provider.'
});

export const ConformanceResult = Schema.Literals(['passed', 'failed', 'skipped', 'unsupportedDeclared']).annotate({
  identifier: 'ConformanceResult',
  description: 'Result of one provider conformance scenario.'
});

/** One setup requirement a provider reports before selection. */
export class AgentProviderSetupRequirementRead extends Schema.Class<AgentProviderSetupRequirementRead>(
  'AgentProviderSetupRequirementRead'
)(
  {
    /** Stable setup requirement key. */
    key: Schema.String.annotate({
      description: 'Stable setup requirement key.'
    }),
    /** Safe label for operators. */
    label: Schema.String.annotate({
      description: 'Human-readable setup requirement label.'
    }),
    /** Whether the requirement is satisfied. */
    isSatisfied: Schema.Boolean.annotate({
      description: 'Whether the requirement is satisfied.'
    }),
    /** Safe remediation text, or null when not needed. */
    remediation: Schema.NullOr(Schema.String).annotate({
      description: 'Safe remediation text for missing setup.'
    })
  },
  {
    identifier: 'AgentProviderSetupRequirementRead',
    title: 'AgentProviderSetupRequirementRead',
    description: 'Decoded provider setup requirement.'
  }
) {}

/** Redacted provider diagnostic safe for operators. */
export class AgentProviderDiagnosticRead extends Schema.Class<AgentProviderDiagnosticRead>(
  'AgentProviderDiagnosticRead'
)(
  {
    /** Stable diagnostic key. */
    key: Schema.String.annotate({
      description: 'Stable diagnostic key.'
    }),
    /** Redacted diagnostic value. */
    value: Schema.String.annotate({
      description: 'Redacted provider diagnostic value.'
    }),
    /** Whether this diagnostic was redacted before storage or output. */
    isRedacted: Schema.Boolean.annotate({
      description: 'Whether the diagnostic was redacted.'
    })
  },
  {
    identifier: 'AgentProviderDiagnosticRead',
    title: 'AgentProviderDiagnosticRead',
    description: 'Redacted provider diagnostic.'
  }
) {}

/** Provider capability manifest decoded before provider selection. */
export class ProviderCapabilityManifestRead extends Schema.Class<ProviderCapabilityManifestRead>(
  'ProviderCapabilityManifestRead'
)(
  {
    /** Whether the provider emits visible streaming events. */
    streaming: Schema.Boolean,
    /** Follow-up input support. */
    followUps: ProviderFollowUpSupport,
    /** Cancellation support. */
    cancellation: ProviderCancellationSupport,
    /** Resume and continuation support. */
    resume: ProviderResumeSupport,
    /** Whether provider-native slash commands may pass through. */
    nativeSlashCommands: Schema.Boolean,
    /** Tool enforcement owner. */
    tools: ProviderToolEnforcement,
    /** Provider-native user-question handling. */
    userQuestions: ProviderUserQuestionMode,
    /** Workspace injection modes supported by this provider. */
    workspaceInjection: Schema.Array(WorkspaceInjectionMode),
    /** Normalized event names the provider may emit. */
    eventTypes: Schema.Array(Schema.String).annotate({
      description: 'Normalized Pawrrtal event names this provider may emit.'
    })
  },
  {
    identifier: 'ProviderCapabilityManifestRead',
    title: 'ProviderCapabilityManifestRead',
    description: 'Decoded provider capability manifest.'
  }
) {}

/** Selectable Agent Provider definition. */
export class AgentProviderRead extends Schema.Class<AgentProviderRead>('AgentProviderRead')(
  {
    /** Stable provider id. */
    providerId: Ids.provider,
    /** Human-readable provider name. */
    displayName: Schema.String.annotate({
      description: 'Human-readable provider name.'
    }),
    /** Provider runtime family. */
    kind: ProviderKind,
    /** Adapter or native runtime version. */
    version: Schema.String.annotate({
      description: 'Adapter or native runtime version.'
    }),
    /** Cheap readiness state. */
    readiness: ProviderReadiness,
    /** Declared provider capabilities. */
    capabilities: ProviderCapabilityManifestRead,
    /** Resume support summary. */
    continuation: ProviderResumeSupport,
    /** Setup requirements safe for operator output. */
    setupRequirements: Schema.Array(AgentProviderSetupRequirementRead),
    /** Redacted provider diagnostics. */
    diagnostics: Schema.Array(AgentProviderDiagnosticRead)
  },
  {
    identifier: 'AgentProviderRead',
    title: 'AgentProviderRead',
    description: 'Decoded Agent Provider definition.'
  }
) {}

/** Latest result for one provider conformance scenario. */
export class ProviderConformanceResultRead extends Schema.Class<ProviderConformanceResultRead>(
  'ProviderConformanceResultRead'
)(
  {
    /** Conformance run id. */
    runId: Ids.conformanceRun,
    /** Provider tested by the scenario. */
    providerId: Ids.provider,
    /** Scenario id. */
    scenarioId: Ids.scenario,
    /** Scenario result. */
    result: ConformanceResult,
    /** Capabilities demonstrated during this run. */
    observedCapabilities: Schema.Array(Ids.capability),
    /** Redacted diagnostics for failed or skipped scenarios. */
    diagnostics: Schema.Array(AgentProviderDiagnosticRead),
    /** Run timestamp. */
    createdAt: Schema.DateTimeUtcFromString.annotate({
      description: 'Conformance run timestamp.'
    })
  },
  {
    identifier: 'ProviderConformanceResultRead',
    title: 'ProviderConformanceResultRead',
    description: 'Provider conformance result visible to operators.'
  }
) {}
