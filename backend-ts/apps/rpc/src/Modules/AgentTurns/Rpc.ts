/** Effect RPC handlers for provider-backed Agent Turns. */

import type {
  AgentTurnId,
  MessageId,
  ProviderId,
  ProviderSessionId,
  SessionId,
  WorkspaceId
} from '@pawrrtal/domain-core';
import { Ids } from '@pawrrtal/domain-core';
import { ProviderContractError, ProviderNotReadyError } from '@pawrrtal/domain-core/Modules/AgentProviders/Errors';
import type { AgentProviderEventRead } from '@pawrrtal/domain-core/Modules/AgentTurns/Domain';
import { AgentTurnRead, ProviderSessionRead } from '@pawrrtal/domain-core/Modules/AgentTurns/Domain';
import { AgentTurnNotFoundError } from '@pawrrtal/domain-core/Modules/AgentTurns/Errors';
import { WorkspaceDiagnosticRead } from '@pawrrtal/domain-core/Modules/Sessions/Domain';
import {
  AgentProviderService,
  AgentProviderServiceLive,
  ProviderQueryInput,
  WorkspaceTurnSummary
} from '@pawrrtal/harness';
import { AgentTurnsRpcProtocol } from '@pawrrtal/rpc-core';
import { DateTime, Effect, Layer, Schema, Stream } from 'effect';

const defaultProviderId: ProviderId = Schema.decodeSync(Ids.provider)('deterministic');
const defaultWorkspaceId: WorkspaceId = Schema.decodeSync(Ids.workspace)('00000000-0000-4000-8000-000000000000');

const makeTurnId = (): AgentTurnId => Schema.decodeSync(Ids.agentTurn)(crypto.randomUUID());
const makeMessageId = (): MessageId => Schema.decodeSync(Ids.message)(crypto.randomUUID());
const makeProviderSessionId = (): ProviderSessionId => Schema.decodeSync(Ids.providerSession)(crypto.randomUUID());

/** Creates provider-safe Workspace materialization metadata for RPC starts. */
const makeWorkspaceSummary = (workspaceId: WorkspaceId): WorkspaceTurnSummary =>
  new WorkspaceTurnSummary({
    workspaceId,
    instructionDigest: `workspace:${workspaceId}:instructions`,
    agentBrainDigest: `workspace:${workspaceId}:brain`,
    envPolicyDigest: `workspace:${workspaceId}:env`
  });

/** Builds the provider-session record used by an RPC-started turn. */
const makeProviderSession = (
  sessionId: SessionId,
  providerId: ProviderId,
  providerSessionId: ProviderSessionId
): Effect.Effect<ProviderSessionRead> =>
  Effect.gen(function* () {
    const now = yield* DateTime.now;
    return new ProviderSessionRead({
      providerSessionId,
      sessionId,
      providerId,
      continuationFingerprint: `${providerId}:rpc:fresh`,
      resumeMode: 'rotationOnly',
      status: 'active',
      lastActivityAt: now,
      rotationReason: null,
      invalidatedAt: null
    });
  });

/** Builds a public turn result after provider events are normalized. */
const makeTurn = (input: {
  readonly turnId: AgentTurnId;
  readonly sessionId: SessionId;
  readonly providerId: ProviderId;
  readonly providerSessionId: ProviderSessionId;
  readonly inputMessageId: MessageId;
  readonly events: ReadonlyArray<AgentProviderEventRead>;
}): Effect.Effect<AgentTurnRead> =>
  Effect.gen(function* () {
    const now = yield* DateTime.now;
    const lastEvent = input.events.length === 0 ? null : (input.events[input.events.length - 1] ?? null);
    return new AgentTurnRead({
      turnId: input.turnId,
      sessionId: input.sessionId,
      providerId: input.providerId,
      providerSessionId: input.providerSessionId,
      workspace: new WorkspaceDiagnosticRead({
        workspaceId: defaultWorkspaceId,
        name: `Workspace ${defaultWorkspaceId.slice(0, 8)}`,
        materializationStatus: 'resolved'
      }),
      inputMessageId: input.inputMessageId,
      state: 'complete',
      sequence: 1,
      lastProgressAt: lastEvent === null ? null : lastEvent.createdAt,
      failure: null,
      createdAt: now,
      startedAt: now,
      finishedAt: now
    });
  });

/** Live RPC turn handlers. */
export const AgentTurnsRpcLive = AgentTurnsRpcProtocol.toLayer({
  'agentTurns.start': ({ sessionId, input }) =>
    Effect.gen(function* () {
      const providers = yield* AgentProviderService;
      const providerId = input.providerId ?? defaultProviderId;
      const workspaceId = input.workspaceId ?? defaultWorkspaceId;
      const turnId = makeTurnId();
      const providerSessionId = makeProviderSessionId();
      const providerSession = yield* makeProviderSession(sessionId, providerId, providerSessionId);
      const queryInput = new ProviderQueryInput({
        turnId,
        sessionId,
        providerSessionId,
        prompt: input.message,
        followUpBacklog: [],
        continuationFingerprint: providerSession.continuationFingerprint,
        workspace: makeWorkspaceSummary(workspaceId),
        capabilityBoundaryId: Schema.decodeSync(Ids.capabilityBoundary)('rpc-default'),
        suppressTerminalOutputAfterCancellation: true
      });
      const query = yield* providers
        .startQuery(providerId, queryInput)
        .pipe(Effect.mapError((error) => new ProviderNotReadyError({ detail: error.detail, providerId })));
      const events = yield* query.events.pipe(
        Stream.runCollect,
        Effect.mapError((error) => new ProviderContractError({ detail: error.detail, providerId }))
      );
      return yield* makeTurn({
        turnId,
        sessionId,
        providerId,
        providerSessionId,
        inputMessageId: makeMessageId(),
        events
      });
    }),
  'agentTurns.events': ({ sessionId, turnId }) =>
    Stream.fail(
      new AgentTurnNotFoundError({
        detail: 'RPC event replay storage is not enabled in this slice.',
        sessionId,
        turnId
      })
    ),
  'agentTurns.followUp': ({ sessionId, turnId }) =>
    Effect.fail(
      new AgentTurnNotFoundError({ detail: 'RPC follow-up storage is not enabled in this slice.', sessionId, turnId })
    ),
  'agentTurns.cancel': ({ sessionId, turnId }) =>
    Effect.fail(
      new AgentTurnNotFoundError({
        detail: 'RPC cancellation storage is not enabled in this slice.',
        sessionId,
        turnId
      })
    )
}).pipe(Layer.provide([AgentProviderServiceLive]));
