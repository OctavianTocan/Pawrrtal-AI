/** Shared conformance runner for selectable Agent Providers. */

import type { CapabilityId } from '@pawrrtal/domain-core';
import { Ids } from '@pawrrtal/domain-core';
import {
  AgentProviderDiagnosticRead,
  AgentProviderRead,
  ProviderConformanceResultRead
} from '@pawrrtal/domain-core/Modules/AgentProviders/Domain';
import { DateTime, Effect, Schema } from 'effect';
import { collectQueryEvents } from '../Runtime/SessionRunner';
import type { AgentProvider } from './Contract';
import { ProviderContractHarnessError } from './Errors';
import { ContinuationRotationInput, ProviderQueryInput, WorkspaceTurnSummary } from './InternalDomain';

const StreamingCapabilityId: CapabilityId = Schema.decodeSync(Ids.capability)('streaming');
const FollowUpCapabilityId: CapabilityId = Schema.decodeSync(Ids.capability)('follow-up-input');
const CancellationCapabilityId: CapabilityId = Schema.decodeSync(Ids.capability)('cancellation');
const ContinuationCapabilityId: CapabilityId = Schema.decodeSync(Ids.capability)('continuation-rotation');
const DiagnosticsCapabilityId: CapabilityId = Schema.decodeSync(Ids.capability)('diagnostic-redaction');
const SimpleTurnScenarioId = Schema.decodeSync(Ids.scenario)('base.simple-turn');
const ManifestScenarioId = Schema.decodeSync(Ids.scenario)('base.manifest-decodes');
const RotationScenarioId = Schema.decodeSync(Ids.scenario)('base.continuation-rotation');
const CanonicalEventTypes = [
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
] as const;

/** Creates a safe conformance diagnostic. */
const diagnostic = (key: string, value: string): AgentProviderDiagnosticRead =>
  new AgentProviderDiagnosticRead({
    key,
    value,
    isRedacted: false
  });

/** Creates a conformance result row with Effect-managed time. */
const makeConformanceResult = (input: {
  readonly providerId: AgentProviderRead['providerId'];
  readonly scenarioId: ProviderConformanceResultRead['scenarioId'];
  readonly result: ProviderConformanceResultRead['result'];
  readonly observedCapabilities: ReadonlyArray<CapabilityId>;
  readonly diagnostics: ReadonlyArray<AgentProviderDiagnosticRead>;
}): Effect.Effect<ProviderConformanceResultRead> =>
  Effect.gen(function* () {
    const now = yield* DateTime.now;
    return new ProviderConformanceResultRead({
      runId: Schema.decodeSync(Ids.conformanceRun)(crypto.randomUUID()),
      providerId: input.providerId,
      scenarioId: input.scenarioId,
      result: input.result,
      observedCapabilities: input.observedCapabilities,
      diagnostics: input.diagnostics,
      createdAt: now
    });
  });

/** Fails conformance when a provider definition is incomplete. */
const failProviderContract = (
  providerId: AgentProviderRead['providerId'] | null,
  detail: string
): Effect.Effect<never, ProviderContractHarnessError> =>
  Effect.fail(
    new ProviderContractHarnessError({
      detail,
      providerId,
      safeNextAction: 'Fix the provider definition before registering it.'
    })
  );

/** Checks whether a text value belongs to the public provider event taxonomy. */
const isCanonicalEventType = (eventType: string): boolean =>
  CanonicalEventTypes.some((canonicalEventType) => canonicalEventType === eventType);

/**
 * Validates one decoded provider definition before it can be selected.
 *
 * @param definition - Public provider definition emitted by an adapter.
 * @returns The validated definition.
 */
export function validateProviderDefinition(
  definition: AgentProviderRead
): Effect.Effect<AgentProviderRead, ProviderContractHarnessError> {
  return Effect.gen(function* () {
    const decoded = yield* Schema.decodeEffect(AgentProviderRead)(definition).pipe(
      Effect.mapError(
        (error) =>
          new ProviderContractHarnessError({
            detail: String(error),
            providerId: null,
            safeNextAction: 'Decode the provider definition through AgentProviderRead.'
          })
      )
    );

    if (decoded.displayName.trim().length === 0) {
      return yield* failProviderContract(decoded.providerId, 'Provider display name must not be empty.');
    }
    if (decoded.version.trim().length === 0) {
      return yield* failProviderContract(decoded.providerId, 'Provider version must not be empty.');
    }
    if (decoded.setupRequirements.length === 0) {
      return yield* failProviderContract(decoded.providerId, 'Provider must declare at least one setup requirement.');
    }
    if (decoded.capabilities.eventTypes.length === 0) {
      return yield* failProviderContract(decoded.providerId, 'Provider must declare normalized event types.');
    }

    yield* Effect.forEach(
      decoded.capabilities.eventTypes,
      (eventType) =>
        isCanonicalEventType(eventType)
          ? Effect.void
          : Effect.fail(
              new ProviderContractHarnessError({
                detail: `Provider declares unsupported event type: ${eventType}.`,
                providerId: decoded.providerId,
                safeNextAction: 'Map provider-native events to the canonical Pawrrtal taxonomy.'
              })
            ),
      { discard: true }
    );

    if (!decoded.capabilities.eventTypes.includes('turn.started')) {
      return yield* failProviderContract(decoded.providerId, 'Provider must declare turn.started events.');
    }
    if (
      !(decoded.capabilities.eventTypes.includes('activity') || decoded.capabilities.eventTypes.includes('progress'))
    ) {
      return yield* failProviderContract(decoded.providerId, 'Provider must declare activity or progress events.');
    }
    if (!decoded.capabilities.eventTypes.includes('turn.completed')) {
      return yield* failProviderContract(decoded.providerId, 'Provider must declare turn.completed events.');
    }

    return decoded;
  });
}

/** Creates decoded provider query input for a conformance turn. */
const makeConformanceInput = (definition: AgentProviderRead): ProviderQueryInput =>
  new ProviderQueryInput({
    turnId: Schema.decodeSync(Ids.agentTurn)(crypto.randomUUID()),
    sessionId: Schema.decodeSync(Ids.session)(crypto.randomUUID()),
    providerSessionId: null,
    prompt: 'Run the Pawrrtal provider conformance simple-turn scenario.',
    followUpBacklog: [],
    continuationFingerprint: null,
    workspace: new WorkspaceTurnSummary({
      workspaceId: Schema.decodeSync(Ids.workspace)(crypto.randomUUID()),
      instructionDigest: `conformance:${definition.providerId}:instructions`,
      agentBrainDigest: `conformance:${definition.providerId}:brain`,
      envPolicyDigest: `conformance:${definition.providerId}:env`
    }),
    capabilityBoundaryId: Schema.decodeSync(Ids.capabilityBoundary)('conformance-base'),
    suppressTerminalOutputAfterCancellation: true
  });

/** Runs the base simple-turn conformance scenario for a ready provider. */
const runSimpleTurn = (
  provider: AgentProvider,
  definition: AgentProviderRead
): Effect.Effect<ProviderConformanceResultRead> =>
  Effect.gen(function* () {
    const query = yield* provider.query(makeConformanceInput(definition));
    const events = yield* collectQueryEvents(query);
    const eventTypes = events.map((event) => event.type);
    const hasTerminalAnswer = eventTypes.includes('answer.completed') && eventTypes.includes('turn.completed');
    const hasActivity = eventTypes.includes('activity') || eventTypes.includes('progress');
    return yield* makeConformanceResult({
      providerId: definition.providerId,
      scenarioId: SimpleTurnScenarioId,
      result: eventTypes.includes('turn.started') && hasActivity && hasTerminalAnswer ? 'passed' : 'failed',
      observedCapabilities: [StreamingCapabilityId],
      diagnostics: [
        diagnostic('events', eventTypes.join(',')),
        diagnostic(
          'safeNextAction',
          hasTerminalAnswer ? 'Provider emitted a terminal answer.' : 'Inspect event mapping.'
        )
      ]
    });
  }).pipe(
    Effect.catchIf(
      () => true,
      (error) =>
        makeConformanceResult({
          providerId: definition.providerId,
          scenarioId: SimpleTurnScenarioId,
          result: 'failed',
          observedCapabilities: [StreamingCapabilityId],
          diagnostics: [
            diagnostic('error', error._tag),
            diagnostic('safeNextAction', error.safeNextAction ?? 'Inspect provider setup and event mapping.')
          ]
        }),
      (error) =>
        makeConformanceResult({
          providerId: definition.providerId,
          scenarioId: SimpleTurnScenarioId,
          result: 'failed',
          observedCapabilities: [StreamingCapabilityId],
          diagnostics: [
            diagnostic('error', error._tag),
            diagnostic('safeNextAction', error.safeNextAction ?? 'Inspect provider setup and event mapping.')
          ]
        })
    )
  );

/** Runs a provider-owned continuation rotation check. */
const runContinuationRotation = (
  provider: AgentProvider,
  definition: AgentProviderRead
): Effect.Effect<ProviderConformanceResultRead> =>
  Effect.gen(function* () {
    const decision = yield* provider.maybeRotateContinuation(
      new ContinuationRotationInput({
        providerId: definition.providerId,
        sessionId: Schema.decodeSync(Ids.session)(crypto.randomUUID()),
        continuationFingerprint: 'conformance:stale',
        reason: 'conformance rotation check'
      })
    );
    return yield* makeConformanceResult({
      providerId: definition.providerId,
      scenarioId: RotationScenarioId,
      result: ['reuse', 'rotate', 'reset'].includes(decision.action) ? 'passed' : 'failed',
      observedCapabilities: [ContinuationCapabilityId],
      diagnostics: [diagnostic('rotation', `${decision.action}:${decision.reason}`)]
    });
  }).pipe(
    Effect.catchIf(
      () => true,
      (error) =>
        makeConformanceResult({
          providerId: definition.providerId,
          scenarioId: RotationScenarioId,
          result: 'failed',
          observedCapabilities: [ContinuationCapabilityId],
          diagnostics: [
            diagnostic('error', error._tag),
            diagnostic('safeNextAction', error.safeNextAction ?? 'Inspect continuation rotation mapping.')
          ]
        }),
      (error) =>
        makeConformanceResult({
          providerId: definition.providerId,
          scenarioId: RotationScenarioId,
          result: 'failed',
          observedCapabilities: [ContinuationCapabilityId],
          diagnostics: [
            diagnostic('error', error._tag),
            diagnostic('safeNextAction', error.safeNextAction ?? 'Inspect continuation rotation mapping.')
          ]
        })
    )
  );

/**
 * Runs the base conformance pack for one provider adapter.
 *
 * @param provider - Provider adapter to evaluate.
 * @returns Latest conformance rows for operator diagnostics.
 */
export function runProviderConformance(
  provider: AgentProvider
): Effect.Effect<ReadonlyArray<ProviderConformanceResultRead>, ProviderContractHarnessError> {
  return Effect.gen(function* () {
    const rawDefinition = yield* provider.describe.pipe(
      Effect.mapError(
        (error) =>
          new ProviderContractHarnessError({
            detail: error.detail,
            providerId: error.providerId,
            safeNextAction: error.safeNextAction
          })
      )
    );
    const definition = yield* validateProviderDefinition(rawDefinition);
    const manifest = yield* makeConformanceResult({
      providerId: definition.providerId,
      scenarioId: ManifestScenarioId,
      result: 'passed',
      observedCapabilities: [DiagnosticsCapabilityId, FollowUpCapabilityId, CancellationCapabilityId],
      diagnostics: [diagnostic('readiness', definition.readiness)]
    });

    if (definition.readiness !== 'ready') {
      const skipped = yield* makeConformanceResult({
        providerId: definition.providerId,
        scenarioId: SimpleTurnScenarioId,
        result: 'skipped',
        observedCapabilities: [StreamingCapabilityId],
        diagnostics: [
          diagnostic('readiness', definition.readiness),
          diagnostic('safeNextAction', 'Satisfy provider setup before running turn conformance.')
        ]
      });
      return [manifest, skipped];
    }

    const simpleTurn = yield* runSimpleTurn(provider, definition);
    const rotation = yield* runContinuationRotation(provider, definition);
    return [manifest, simpleTurn, rotation];
  });
}
