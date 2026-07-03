/** Capability policy checks for host-owned provider boundaries. */

import { assert, describe, it } from '@effect/vitest';
import { Ids } from '@pawrrtal/domain-core';
import { Effect, Schema, Stream } from 'effect';
import {
  CapabilityPolicyInput,
  DeterministicProviderConfig,
  evaluateTurnPromptCapability,
  makeDeterministicProvider,
  ProviderQueryInput,
  WorkspaceTurnSummary
} from '../src';

const restrictedBoundaryId = Schema.decodeSync(Ids.capabilityBoundary)('restricted');
const baseBoundaryId = Schema.decodeSync(Ids.capabilityBoundary)('base');

/** Creates provider input for capability scenario tests. */
const makeInput = (): ProviderQueryInput =>
  new ProviderQueryInput({
    turnId: Schema.decodeSync(Ids.agentTurn)('00000000-0000-4000-8000-000000000601'),
    sessionId: Schema.decodeSync(Ids.session)('00000000-0000-4000-8000-000000000602'),
    providerSessionId: null,
    prompt: 'capability scenario',
    followUpBacklog: [],
    continuationFingerprint: null,
    workspace: new WorkspaceTurnSummary({
      workspaceId: Schema.decodeSync(Ids.workspace)('00000000-0000-4000-8000-000000000603'),
      instructionDigest: 'instructions',
      agentBrainDigest: 'brain',
      envPolicyDigest: 'env'
    }),
    capabilityBoundaryId: baseBoundaryId,
    suppressTerminalOutputAfterCancellation: true
  });

describe('CapabilityPolicy', (): void => {
  it.effect(
    'denies shell prompts for restricted boundaries',
    (): Effect.Effect<void> =>
      Effect.gen(function* () {
        const decision = yield* evaluateTurnPromptCapability(
          new CapabilityPolicyInput({
            capabilityBoundaryId: restrictedBoundaryId,
            prompt: 'run a shell command'
          })
        );

        assert.strictEqual(decision?.decision ?? null, 'denied');
      })
  );

  it.effect(
    'marks provider-native prompts unsupported',
    (): Effect.Effect<void> =>
      Effect.gen(function* () {
        const decision = yield* evaluateTurnPromptCapability(
          new CapabilityPolicyInput({
            capabilityBoundaryId: baseBoundaryId,
            prompt: 'use a provider-native slash command'
          })
        );

        assert.strictEqual(decision?.decision ?? null, 'unsupported');
      })
  );

  it.effect(
    'emits deterministic capability-denied and unsupported events',
    (): Effect.Effect<void> =>
      Effect.gen(function* () {
        const deniedProvider = makeDeterministicProvider(
          new DeterministicProviderConfig({ enabled: true, scenario: 'capabilityDenied' })
        );
        const unsupportedProvider = makeDeterministicProvider(
          new DeterministicProviderConfig({ enabled: true, scenario: 'unsupportedCapability' })
        );
        const deniedEvents = yield* (yield* deniedProvider.query(makeInput())).events.pipe(Stream.runCollect);
        const unsupportedEvents = yield* (yield* unsupportedProvider.query(makeInput())).events.pipe(Stream.runCollect);

        assert.include(
          deniedEvents.map((event) => event.type),
          'capability.denied'
        );
        assert.include(
          unsupportedEvents.map((event) => event.type),
          'capability.denied'
        );
      })
  );
});
