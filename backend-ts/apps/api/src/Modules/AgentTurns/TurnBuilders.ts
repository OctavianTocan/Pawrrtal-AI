/** Agent Turn construction helpers shared by service operations. */

import type { AgentTurnId, MessageId, ProviderId, ProviderSessionId, SessionId } from '@pawrrtal/domain-core';
import { Ids } from '@pawrrtal/domain-core';
import type { CapabilityDecisionRead } from '@pawrrtal/domain-core/Modules/AgentTurns/Domain';
import {
  AgentProviderEventRead,
  AgentTurnFailureRead,
  AgentTurnRead,
  CapabilityDeniedEventPayload,
  ProviderSessionRead
} from '@pawrrtal/domain-core/Modules/AgentTurns/Domain';
import type { WorkspaceDiagnosticRead } from '@pawrrtal/domain-core/Modules/Sessions/Domain';
import { DateTime, Effect, Schema } from 'effect';

/** Creates a new public Agent Turn id. */
export const makeTurnId = (): AgentTurnId => Schema.decodeSync(Ids.agentTurn)(crypto.randomUUID());

/** Creates a new public Message id. */
export const makeMessageId = (): MessageId => Schema.decodeSync(Ids.message)(crypto.randomUUID());

/** Creates a new public Provider Session id. */
export const makeProviderSessionId = (): ProviderSessionId =>
  Schema.decodeSync(Ids.providerSession)(crypto.randomUUID());

/** Creates a new public provider event id. */
const makeEventId = (): AgentProviderEventRead['eventId'] => Schema.decodeSync(Ids.event)(crypto.randomUUID());

/** Creates a public provider-session record for one turn. */
export const makeProviderSession = (
  sessionId: SessionId,
  providerId: ProviderId,
  providerSessionId: ProviderSessionId,
  rotationReason: string | null = null
): Effect.Effect<ProviderSessionRead> =>
  Effect.gen(function* () {
    const now = yield* DateTime.now;
    return new ProviderSessionRead({
      providerSessionId,
      sessionId,
      providerId,
      continuationFingerprint: `${providerId}:fresh`,
      resumeMode: 'rotationOnly',
      status: 'active',
      lastActivityAt: now,
      rotationReason,
      invalidatedAt: null
    });
  });

/** Creates a denied-capability event for a turn that never reaches the provider. */
export const makeCapabilityDeniedEvent = (input: {
  readonly turnId: AgentTurnId;
  readonly decision: CapabilityDecisionRead;
}): Effect.Effect<AgentProviderEventRead> =>
  Effect.gen(function* () {
    const now = yield* DateTime.now;
    return new AgentProviderEventRead({
      eventId: makeEventId(),
      turnId: input.turnId,
      sequence: 1,
      type: 'capability.denied',
      visibility: 'user',
      payload: new CapabilityDeniedEventPayload({
        capabilityId: input.decision.capabilityId,
        decision: input.decision.decision,
        reason: input.decision.reason,
        safeNextAction: 'Change the Workspace capability boundary before retrying this turn.'
      }),
      createdAt: now
    });
  });

/** Builds the first public running turn before provider events are drained. */
export const makeRunningTurn = (input: {
  readonly turnId: AgentTurnId;
  readonly sessionId: SessionId;
  readonly providerId: ProviderId;
  readonly providerSessionId: ProviderSessionId;
  readonly inputMessageId: MessageId;
  readonly sequence: number;
  readonly workspace: WorkspaceDiagnosticRead;
}): Effect.Effect<AgentTurnRead> =>
  Effect.gen(function* () {
    const now = yield* DateTime.now;
    return new AgentTurnRead({
      turnId: input.turnId,
      sessionId: input.sessionId,
      providerId: input.providerId,
      providerSessionId: input.providerSessionId,
      workspace: input.workspace,
      inputMessageId: input.inputMessageId,
      state: 'running',
      sequence: input.sequence,
      lastProgressAt: now,
      failure: null,
      createdAt: now,
      startedAt: now,
      finishedAt: null
    });
  });

/** Builds a terminal turn for host-denied capability attempts. */
export const makeCapabilityDeniedTurn = (input: {
  readonly turnId: AgentTurnId;
  readonly sessionId: SessionId;
  readonly providerId: ProviderId;
  readonly inputMessageId: MessageId;
  readonly sequence: number;
  readonly workspace: WorkspaceDiagnosticRead;
  readonly decision: CapabilityDecisionRead;
}): Effect.Effect<AgentTurnRead> =>
  Effect.gen(function* () {
    const now = yield* DateTime.now;
    return new AgentTurnRead({
      turnId: input.turnId,
      sessionId: input.sessionId,
      providerId: input.providerId,
      providerSessionId: null,
      workspace: input.workspace,
      inputMessageId: input.inputMessageId,
      state: 'failed',
      sequence: input.sequence,
      lastProgressAt: now,
      failure: new AgentTurnFailureRead({
        code: `capability.${input.decision.decision}`,
        message: input.decision.reason,
        safeNextAction: 'Change the Workspace capability boundary before retrying this turn.'
      }),
      createdAt: now,
      startedAt: null,
      finishedAt: now
    });
  });

/** Builds a terminal public turn while preserving its original identity. */
export const makeTerminalTurn = (input: {
  readonly turn: AgentTurnRead;
  readonly state: AgentTurnRead['state'];
  readonly events: ReadonlyArray<AgentProviderEventRead>;
  readonly failure: AgentTurnFailureRead | null;
}): Effect.Effect<AgentTurnRead> =>
  Effect.gen(function* () {
    const now = yield* DateTime.now;
    const lastEvent = input.events.length === 0 ? null : (input.events[input.events.length - 1] ?? null);
    return new AgentTurnRead({
      turnId: input.turn.turnId,
      sessionId: input.turn.sessionId,
      providerId: input.turn.providerId,
      providerSessionId: input.turn.providerSessionId,
      workspace: input.turn.workspace,
      inputMessageId: input.turn.inputMessageId,
      state: input.state,
      sequence: input.turn.sequence,
      lastProgressAt: lastEvent === null ? input.turn.lastProgressAt : lastEvent.createdAt,
      failure: input.failure,
      createdAt: input.turn.createdAt,
      startedAt: input.turn.startedAt,
      finishedAt: now
    });
  });
