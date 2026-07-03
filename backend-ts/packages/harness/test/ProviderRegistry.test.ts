/** Provider registry validation and conformance runner checks. */

import { assert, describe, it } from '@effect/vitest';
import { Ids } from '@pawrrtal/domain-core';
import {
  AgentProviderDiagnosticRead,
  AgentProviderRead,
  AgentProviderSetupRequirementRead,
  ProviderCapabilityManifestRead
} from '@pawrrtal/domain-core/Modules/AgentProviders/Domain';
import { Effect, Schema } from 'effect';
import {
  DeterministicProviderConfig,
  makeDeterministicProvider,
  ProviderContractHarnessError,
  runProviderConformance,
  validateProviderDefinition
} from '../src';

const providerId = Schema.decodeSync(Ids.provider)('invalid-provider');

/** Creates an intentionally incomplete provider definition. */
const makeInvalidDefinition = (): AgentProviderRead =>
  new AgentProviderRead({
    providerId,
    displayName: 'Invalid Provider',
    kind: 'deterministic',
    version: '0.0.0',
    readiness: 'ready',
    capabilities: new ProviderCapabilityManifestRead({
      streaming: true,
      followUps: 'activeTurn',
      cancellation: 'bestEffort',
      resume: 'rotationOnly',
      nativeSlashCommands: false,
      tools: 'host',
      userQuestions: 'hostMediated',
      workspaceInjection: ['systemPrompt'],
      eventTypes: []
    }),
    continuation: 'rotationOnly',
    setupRequirements: [
      new AgentProviderSetupRequirementRead({
        key: 'registered',
        label: 'Provider registered',
        isSatisfied: true,
        remediation: null
      })
    ],
    diagnostics: [
      new AgentProviderDiagnosticRead({
        key: 'source',
        value: 'test',
        isRedacted: false
      })
    ]
  });

describe('ProviderRegistry', (): void => {
  it.effect(
    'rejects provider definitions without normalized event declarations',
    (): Effect.Effect<void> =>
      Effect.gen(function* () {
        const error = yield* validateProviderDefinition(makeInvalidDefinition()).pipe(Effect.flip);

        assert.instanceOf(error, ProviderContractHarnessError);
      })
  );

  it.effect(
    'runs deterministic provider conformance through the real adapter',
    (): Effect.Effect<void> =>
      Effect.gen(function* () {
        const provider = makeDeterministicProvider(
          new DeterministicProviderConfig({ enabled: true, scenario: 'success' })
        );
        const rows = yield* runProviderConformance(provider);

        assert.isAtLeast(rows.length, 3);
        assert.isTrue(rows.every((row) => row.providerId === provider.providerId));
        assert.include(
          rows.map((row) => row.result),
          'passed'
        );
      })
  );
});
