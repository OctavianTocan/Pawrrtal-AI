/** Provider diagnostic redaction helpers for operator-safe output. */

import {
  AgentProviderDiagnosticRead,
  AgentProviderRead,
  ProviderCapabilityManifestRead
} from '@pawrrtal/domain-core/Modules/AgentProviders/Domain';

const RedactedValue = '[redacted]';
const SensitiveKeyFragments = [
  'token',
  'secret',
  'credential',
  'password',
  'key',
  'cwd',
  'path',
  'executable'
] as const;
const SensitiveValueFragments = ['sk-', 'anthropic_', 'bearer ', 'api_key'] as const;

/** Returns true when a diagnostic key implies the value should not be shown. */
const hasSensitiveKey = (key: string): boolean => {
  const lowered = key.toLowerCase();
  return SensitiveKeyFragments.some((fragment) => lowered.includes(fragment));
};

/** Returns true when a diagnostic value looks like a token or credential. */
const hasSensitiveValue = (value: string): boolean => {
  const lowered = value.toLowerCase();
  return SensitiveValueFragments.some((fragment) => lowered.includes(fragment));
};

/**
 * Redacts one provider diagnostic when the key, value, or source mark requires it.
 *
 * @param diagnostic - Provider diagnostic emitted by an adapter.
 * @returns Operator-safe diagnostic.
 */
export function redactProviderDiagnostic(diagnostic: AgentProviderDiagnosticRead): AgentProviderDiagnosticRead {
  const shouldRedact = diagnostic.isRedacted || hasSensitiveKey(diagnostic.key) || hasSensitiveValue(diagnostic.value);
  return new AgentProviderDiagnosticRead({
    key: diagnostic.key,
    value: shouldRedact ? RedactedValue : diagnostic.value,
    isRedacted: shouldRedact
  });
}

/**
 * Redacts every diagnostic on a provider definition.
 *
 * @param definition - Provider definition to sanitize.
 * @returns Provider definition with safe diagnostics.
 */
export function redactProviderDefinition(definition: AgentProviderRead): AgentProviderRead {
  return new AgentProviderRead({
    providerId: definition.providerId,
    displayName: definition.displayName,
    kind: definition.kind,
    version: definition.version,
    readiness: definition.readiness,
    capabilities: new ProviderCapabilityManifestRead({
      streaming: definition.capabilities.streaming,
      followUps: definition.capabilities.followUps,
      cancellation: definition.capabilities.cancellation,
      resume: definition.capabilities.resume,
      nativeSlashCommands: definition.capabilities.nativeSlashCommands,
      tools: definition.capabilities.tools,
      userQuestions: definition.capabilities.userQuestions,
      workspaceInjection: definition.capabilities.workspaceInjection,
      eventTypes: definition.capabilities.eventTypes
    }),
    continuation: definition.continuation,
    setupRequirements: definition.setupRequirements,
    diagnostics: definition.diagnostics.map(redactProviderDiagnostic)
  });
}
