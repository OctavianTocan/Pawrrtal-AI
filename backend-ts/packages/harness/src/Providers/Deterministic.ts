/** CI-safe provider adapter that exercises the shared provider contract without external credentials. */

import type { AgentProviderEventId, CapabilityId, ProviderId } from '@pawrrtal/domain-core';
import { Ids } from '@pawrrtal/domain-core';
import {
  AgentProviderDiagnosticRead,
  AgentProviderRead,
  AgentProviderSetupRequirementRead,
  ProviderCapabilityManifestRead
} from '@pawrrtal/domain-core/Modules/AgentProviders/Domain';
import {
  AgentProviderEventRead,
  CapabilityDeniedEventPayload,
  DiagnosticEventPayload,
  TextEventPayload
} from '@pawrrtal/domain-core/Modules/AgentTurns/Domain';
import { DateTime, Effect, Schema, Stream } from 'effect';
import type { DeterministicProviderConfig } from '../Provider/Config';
import type { AgentProvider, AgentQuery } from '../Provider/Contract';
import { ProviderStreamError } from '../Provider/Errors';
import type {
  ContinuationRotationInput,
  ProviderCancellationReason,
  ProviderFollowUpInput,
  ProviderQueryInput
} from '../Provider/InternalDomain';
import { ContinuationRotationDecision } from '../Provider/InternalDomain';

export const DeterministicProviderId: ProviderId = Schema.decodeSync(Ids.provider)('deterministic');
const ShellCapabilityId: CapabilityId = Schema.decodeSync(Ids.capability)('shell');
const ProviderNativeCapabilityId: CapabilityId = Schema.decodeSync(Ids.capability)('provider-native-action');

/** Public definition for the deterministic provider. */
const makeDefinition = (config: DeterministicProviderConfig): AgentProviderRead =>
  new AgentProviderRead({
    providerId: DeterministicProviderId,
    displayName: 'Deterministic Provider',
    kind: 'deterministic',
    version: '0.1.0',
    readiness: config.enabled ? 'ready' : 'unavailable',
    capabilities: new ProviderCapabilityManifestRead({
      streaming: true,
      followUps: 'activeTurn',
      cancellation: 'bestEffort',
      resume: 'rotationOnly',
      nativeSlashCommands: false,
      tools: 'host',
      userQuestions: 'hostMediated',
      workspaceInjection: ['systemPrompt', 'files'],
      eventTypes: ['turn.started', 'activity', 'progress', 'capability.denied', 'answer.completed', 'turn.completed']
    }),
    continuation: 'rotationOnly',
    setupRequirements: [
      new AgentProviderSetupRequirementRead({
        key: 'registered',
        label: 'Deterministic provider registered',
        isSatisfied: config.enabled,
        remediation: config.enabled ? null : 'Set PAW_PROVIDER_DETERMINISTIC_ENABLED=true.'
      })
    ],
    diagnostics: [
      new AgentProviderDiagnosticRead({
        key: 'scenario',
        value: config.scenario,
        isRedacted: false
      })
    ]
  });

/** Builds a deterministic UUID for repeatable provider event fixtures. */
const makeEventId = (sequence: number): AgentProviderEventId =>
  Schema.decodeSync(Ids.event)(`00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`);

/** Builds one normalized provider event with Effect-managed time. */
const makeEvent = (input: {
  readonly turnId: ProviderQueryInput['turnId'];
  readonly sequence: number;
  readonly type: AgentProviderEventRead['type'];
  readonly visibility: AgentProviderEventRead['visibility'];
  readonly payload: AgentProviderEventRead['payload'];
}): Effect.Effect<AgentProviderEventRead> =>
  Effect.gen(function* () {
    const now = yield* DateTime.now;
    return new AgentProviderEventRead({
      eventId: makeEventId(input.sequence),
      turnId: input.turnId,
      sequence: input.sequence,
      type: input.type,
      visibility: input.visibility,
      payload: input.payload,
      createdAt: now
    });
  });

/** Creates the deterministic success event sequence for one accepted turn. */
const makeSuccessEvents = (input: ProviderQueryInput): Effect.Effect<ReadonlyArray<AgentProviderEventRead>> =>
  Effect.all([
    makeEvent({
      turnId: input.turnId,
      sequence: 1,
      type: 'turn.started',
      visibility: 'operator',
      payload: new TextEventPayload({ text: 'Deterministic provider accepted the turn.' })
    }),
    makeEvent({
      turnId: input.turnId,
      sequence: 2,
      type: 'activity',
      visibility: 'operator',
      payload: new DiagnosticEventPayload({ summary: 'Deterministic work is active.', isRedacted: false })
    }),
    makeEvent({
      turnId: input.turnId,
      sequence: 3,
      type: 'answer.completed',
      visibility: 'user',
      payload: new TextEventPayload({ text: `deterministic:${input.prompt}` })
    }),
    makeEvent({
      turnId: input.turnId,
      sequence: 4,
      type: 'turn.completed',
      visibility: 'operator',
      payload: new TextEventPayload({ text: 'Deterministic provider completed the turn.' })
    })
  ]);

/** Creates the deterministic capability-denial sequence. */
const makeCapabilityDeniedEvents = (input: ProviderQueryInput): Effect.Effect<ReadonlyArray<AgentProviderEventRead>> =>
  Effect.all([
    makeEvent({
      turnId: input.turnId,
      sequence: 1,
      type: 'turn.started',
      visibility: 'operator',
      payload: new TextEventPayload({ text: 'Deterministic provider accepted the turn.' })
    }),
    makeEvent({
      turnId: input.turnId,
      sequence: 2,
      type: 'capability.denied',
      visibility: 'user',
      payload: new CapabilityDeniedEventPayload({
        capabilityId: ShellCapabilityId,
        decision: 'denied',
        reason: 'The deterministic scenario denies shell access.',
        safeNextAction: 'Use a Workspace capability boundary that allows shell access.'
      })
    }),
    makeEvent({
      turnId: input.turnId,
      sequence: 3,
      type: 'turn.completed',
      visibility: 'operator',
      payload: new TextEventPayload({ text: 'Capability denial was surfaced as a normalized event.' })
    })
  ]);

/** Creates the deterministic unsupported-capability sequence. */
const makeUnsupportedCapabilityEvents = (
  input: ProviderQueryInput
): Effect.Effect<ReadonlyArray<AgentProviderEventRead>> =>
  Effect.all([
    makeEvent({
      turnId: input.turnId,
      sequence: 1,
      type: 'turn.started',
      visibility: 'operator',
      payload: new TextEventPayload({ text: 'Deterministic provider accepted the turn.' })
    }),
    makeEvent({
      turnId: input.turnId,
      sequence: 2,
      type: 'capability.denied',
      visibility: 'user',
      payload: new CapabilityDeniedEventPayload({
        capabilityId: ProviderNativeCapabilityId,
        decision: 'unsupported',
        reason: 'The deterministic scenario marks provider-native actions unsupported.',
        safeNextAction: 'Use Pawrrtal host-mediated capabilities instead.'
      })
    }),
    makeEvent({
      turnId: input.turnId,
      sequence: 3,
      type: 'turn.completed',
      visibility: 'operator',
      payload: new TextEventPayload({ text: 'Unsupported capability was surfaced as a normalized event.' })
    })
  ]);

/** Builds an accepted query for the selected deterministic scenario. */
const makeQuery = (config: DeterministicProviderConfig, input: ProviderQueryInput): Effect.Effect<AgentQuery> =>
  Effect.gen(function* () {
    const events =
      config.scenario === 'capabilityDenied'
        ? yield* makeCapabilityDeniedEvents(input)
        : config.scenario === 'unsupportedCapability'
          ? yield* makeUnsupportedCapabilityEvents(input)
          : yield* makeSuccessEvents(input);

    return {
      push: (_input: ProviderFollowUpInput) => Effect.void,
      endInput: Effect.void,
      events:
        config.scenario === 'failure'
          ? Stream.fromIterable(events).pipe(
              Stream.concat(
                Stream.fail(
                  new ProviderStreamError({
                    detail: 'Deterministic failure scenario reached.',
                    providerId: DeterministicProviderId,
                    safeNextAction: 'Switch the deterministic scenario to success.'
                  })
                )
              )
            )
          : Stream.fromIterable(events),
      abort: (_reason: ProviderCancellationReason) => Effect.void
    } as const;
  });

/** Creates the deterministic provider adapter. */
export const makeDeterministicProvider = (config: DeterministicProviderConfig): AgentProvider => ({
  providerId: DeterministicProviderId,
  describe: Effect.succeed(makeDefinition(config)),
  query: (input: ProviderQueryInput) => makeQuery(config, input),
  isSessionInvalid: (failure) => failure._tag === 'ProviderContinuationError',
  maybeRotateContinuation: (_input: ContinuationRotationInput) =>
    Effect.succeed(
      new ContinuationRotationDecision({
        action: config.scenario === 'staleContinuation' ? 'rotate' : 'reuse',
        reason:
          config.scenario === 'staleContinuation'
            ? 'Deterministic stale continuation scenario requested rotation.'
            : 'Deterministic continuation can be reused.',
        nextFingerprint: config.scenario === 'staleContinuation' ? 'deterministic:fresh' : null
      })
    )
});
