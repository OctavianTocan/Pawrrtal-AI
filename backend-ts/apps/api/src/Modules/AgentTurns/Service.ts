/** Agent Turn service that runs provider queries through the harness boundary. */

import type { AgentTurnId, ProviderId, SessionId, UserId } from '@pawrrtal/domain-core';
import type { ProviderContractError } from '@pawrrtal/domain-core/Modules/AgentProviders/Errors';
import { ProviderNotReadyError } from '@pawrrtal/domain-core/Modules/AgentProviders/Errors';
import type {
  AgentCancellationInput,
  AgentProviderEventRead,
  AgentTurnCreateInput,
  AgentTurnRead,
  ProviderSessionRead
} from '@pawrrtal/domain-core/Modules/AgentTurns/Domain';
import { AgentTurnFailureRead } from '@pawrrtal/domain-core/Modules/AgentTurns/Domain';
import { AgentTurnConflictError, AgentTurnNotFoundError } from '@pawrrtal/domain-core/Modules/AgentTurns/Errors';
import type { SessionNotFoundError } from '@pawrrtal/domain-core/Modules/Sessions/Errors';
import type { AgentQuery, ProviderFollowUpInput } from '@pawrrtal/harness';
import {
  AgentProviderService,
  AgentProviderServiceLive,
  CapabilityPolicyInput,
  cancelActiveQuery,
  evaluateTurnPromptCapability,
  materializeWorkspaceForTurn,
  ProviderCancellationReason,
  ProviderQueryInput,
  WorkspaceMaterializationInput
} from '@pawrrtal/harness';
import { Context, Effect, Layer, Ref } from 'effect';
import { SessionsService, SessionsServiceLive } from '../Sessions/Service';
import { makeWorkspaceDiagnostic } from '../Workspaces/Materialization';
import { ActiveTurnQueries, removeActiveQuery, runQueryToCompletion } from './ActiveQueries';
import { isRecoverableTurnState } from './Recovery';
import type { AgentTurnRecord } from './Repo';
import { AgentTurnsRepo, AgentTurnsRepoLive } from './Repo';
import {
  makeCapabilityDeniedEvent,
  makeCapabilityDeniedTurn,
  makeMessageId,
  makeProviderSession,
  makeProviderSessionId,
  makeRunningTurn,
  makeTerminalTurn,
  makeTurnId
} from './TurnBuilders';

/** Agent Turn service scoped by authenticated owner id. */
export class AgentTurnsService extends Context.Service<
  AgentTurnsService,
  {
    /** Starts a provider-backed turn and stores normalized output. */
    readonly create: (
      ownerId: UserId,
      sessionId: SessionId,
      payload: AgentTurnCreateInput
    ) => Effect.Effect<AgentTurnRead, SessionNotFoundError | ProviderNotReadyError | ProviderContractError>;

    /** Lists turns for a Session visible to one owner. */
    readonly list: (
      ownerId: UserId,
      sessionId: SessionId
    ) => Effect.Effect<ReadonlyArray<AgentTurnRead>, SessionNotFoundError>;

    /** Reads one turn. */
    readonly get: (
      ownerId: UserId,
      sessionId: SessionId,
      turnId: AgentTurnId
    ) => Effect.Effect<AgentTurnRead, SessionNotFoundError | AgentTurnNotFoundError>;

    /** Reads normalized events for one turn. */
    readonly events: (
      ownerId: UserId,
      sessionId: SessionId,
      turnId: AgentTurnId
    ) => Effect.Effect<ReadonlyArray<AgentProviderEventRead>, SessionNotFoundError | AgentTurnNotFoundError>;

    /** Sends follow-up input to an active turn. */
    readonly followUp: (
      ownerId: UserId,
      sessionId: SessionId,
      turnId: AgentTurnId,
      input: ProviderFollowUpInput
    ) => Effect.Effect<AgentTurnRead, SessionNotFoundError | AgentTurnNotFoundError | AgentTurnConflictError>;

    /** Requests cancellation for a turn. */
    readonly cancel: (
      ownerId: UserId,
      sessionId: SessionId,
      turnId: AgentTurnId,
      input: AgentCancellationInput
    ) => Effect.Effect<AgentTurnRead, SessionNotFoundError | AgentTurnNotFoundError | AgentTurnConflictError>;

    /** Resets provider-scoped continuation for a Session. */
    readonly resetProviderSession: (
      ownerId: UserId,
      sessionId: SessionId
    ) => Effect.Effect<ProviderSessionRead, SessionNotFoundError>;

    /** Marks orphaned active states as stale after restart or runner loss. */
    readonly recoverStale: (
      ownerId: UserId,
      sessionId: SessionId
    ) => Effect.Effect<ReadonlyArray<AgentTurnRead>, SessionNotFoundError>;
  }
>()('@apps/api/AgentTurns/Service') {}

/** Dependencies needed to build the live Agent Turn service body. */
interface AgentTurnsDependencies {
  /** Turn persistence port. */
  readonly repo: AgentTurnsRepo['Service'];
  /** Session authorization and lookup port. */
  readonly sessions: SessionsService['Service'];
  /** Provider harness registry/service. */
  readonly providers: AgentProviderService['Service'];
  /** In-memory active provider query handles. */
  readonly activeQueries: Ref.Ref<ReadonlyMap<AgentTurnId, AgentQuery>>;
}

/** Internal record lookup helper with owner authorization. */
type GetTurnRecord = (
  ownerId: UserId,
  sessionId: SessionId,
  turnId: AgentTurnId
) => Effect.Effect<AgentTurnRecord, SessionNotFoundError | AgentTurnNotFoundError>;

/** Maps provider start failures to public provider errors. */
const providerStartFailure = (providerId: ProviderId, detail: string): ProviderNotReadyError =>
  new ProviderNotReadyError({ detail, providerId });

/** Creates the authorized turn-record reader. */
const makeGetRecord = (deps: AgentTurnsDependencies): GetTurnRecord =>
  Effect.fn('AgentTurnsService.getRecord')(function* (ownerId: UserId, sessionId: SessionId, turnId: AgentTurnId) {
    yield* deps.sessions.getRecordForOwner(ownerId, sessionId);
    const record = yield* deps.repo.get(sessionId, turnId);
    if (record === null) {
      return yield* Effect.fail(new AgentTurnNotFoundError({ detail: 'Agent turn was not found.', sessionId, turnId }));
    }
    return record;
  });

/** Creates the turn-starting service operation. */
const makeCreate = (deps: AgentTurnsDependencies): AgentTurnsService['Service']['create'] =>
  Effect.fn('AgentTurnsService.create')(function* (
    ownerId: UserId,
    sessionId: SessionId,
    payload: AgentTurnCreateInput
  ) {
    const sessionRecord = yield* deps.sessions.getRecordForOwner(ownerId, sessionId);
    const providerId = payload.providerId ?? sessionRecord.binding.selectedProviderId;
    const sequence = yield* deps.repo.nextSequence(sessionId);
    const turnId = makeTurnId();
    const inputMessageId = makeMessageId();
    const workspace = yield* makeWorkspaceDiagnostic(sessionRecord.session.workspaceId);
    const capabilityDecision = yield* evaluateTurnPromptCapability(
      new CapabilityPolicyInput({
        capabilityBoundaryId: sessionRecord.binding.capabilityBoundaryId,
        prompt: payload.message
      })
    );
    if (capabilityDecision !== null && capabilityDecision.decision !== 'allowed') {
      const turn = yield* makeCapabilityDeniedTurn({
        turnId,
        sessionId,
        providerId,
        inputMessageId,
        sequence,
        workspace,
        decision: capabilityDecision
      });
      const event = yield* makeCapabilityDeniedEvent({ turnId, decision: capabilityDecision });
      yield* deps.repo.insertResult({ turn, providerSession: null, events: [event] });
      return turn;
    }
    const providerSessionId = makeProviderSessionId();
    const providerSession = yield* makeProviderSession(sessionId, providerId, providerSessionId);
    const workspaceSummary = yield* materializeWorkspaceForTurn(
      new WorkspaceMaterializationInput({
        workspaceId: sessionRecord.session.workspaceId,
        capabilityBoundaryId: sessionRecord.binding.capabilityBoundaryId
      })
    );
    const queryInput = new ProviderQueryInput({
      turnId,
      sessionId,
      providerSessionId,
      prompt: payload.message,
      followUpBacklog: [],
      continuationFingerprint: providerSession.continuationFingerprint,
      workspace: workspaceSummary,
      capabilityBoundaryId: sessionRecord.binding.capabilityBoundaryId,
      suppressTerminalOutputAfterCancellation: true
    });
    const query = yield* deps.providers
      .startQuery(providerId, queryInput)
      .pipe(Effect.mapError((error) => providerStartFailure(providerId, error.detail)));
    const turn = yield* makeRunningTurn({
      turnId,
      sessionId,
      providerId,
      providerSessionId,
      inputMessageId,
      sequence,
      workspace
    });
    const record: AgentTurnRecord = { turn, providerSession, events: [] };
    yield* deps.repo.insertResult(record);
    yield* Ref.update(deps.activeQueries, (queries) => new Map(queries).set(turnId, query));
    yield* runQueryToCompletion({
      repo: deps.repo,
      activeQueries: deps.activeQueries,
      query,
      turn
    }).pipe(Effect.forkDetach, Effect.asVoid);
    return turn;
  });

/** Creates the Session turn list operation. */
const makeList = (deps: AgentTurnsDependencies): AgentTurnsService['Service']['list'] =>
  Effect.fn('AgentTurnsService.list')(function* (ownerId: UserId, sessionId: SessionId) {
    yield* deps.sessions.getRecordForOwner(ownerId, sessionId);
    return yield* deps.repo.listBySession(sessionId);
  });

/** Creates the single-turn read operation. */
const makeGet = (getRecord: GetTurnRecord): AgentTurnsService['Service']['get'] =>
  Effect.fn('AgentTurnsService.get')(function* (ownerId: UserId, sessionId: SessionId, turnId: AgentTurnId) {
    const record = yield* getRecord(ownerId, sessionId, turnId);
    return record.turn;
  });

/** Creates the provider-event read operation. */
const makeEvents = (getRecord: GetTurnRecord): AgentTurnsService['Service']['events'] =>
  Effect.fn('AgentTurnsService.events')(function* (ownerId: UserId, sessionId: SessionId, turnId: AgentTurnId) {
    const record = yield* getRecord(ownerId, sessionId, turnId);
    return record.events;
  });

/** Creates the follow-up operation for active provider turns. */
const makeFollowUp = (
  deps: AgentTurnsDependencies,
  getRecord: GetTurnRecord
): AgentTurnsService['Service']['followUp'] =>
  Effect.fn('AgentTurnsService.followUp')(function* (
    ownerId: UserId,
    sessionId: SessionId,
    turnId: AgentTurnId,
    input: ProviderFollowUpInput
  ) {
    const record = yield* getRecord(ownerId, sessionId, turnId);
    const queries = yield* Ref.get(deps.activeQueries);
    const query = queries.get(turnId) ?? null;
    if (query !== null) {
      yield* query.push(input).pipe(
        Effect.mapError(
          (error) =>
            new AgentTurnConflictError({
              detail: error.detail,
              sessionId,
              turnId: record.turn.turnId
            })
        )
      );
      return record.turn;
    }
    return yield* Effect.fail(
      new AgentTurnConflictError({
        detail: 'Turn is not active and cannot accept follow-up input.',
        sessionId,
        turnId: record.turn.turnId
      })
    );
  });

/** Creates the cancellation operation for active provider turns. */
const makeCancel = (deps: AgentTurnsDependencies, getRecord: GetTurnRecord): AgentTurnsService['Service']['cancel'] =>
  Effect.fn('AgentTurnsService.cancel')(function* (
    ownerId: UserId,
    sessionId: SessionId,
    turnId: AgentTurnId,
    input: AgentCancellationInput
  ) {
    const record = yield* getRecord(ownerId, sessionId, turnId);
    const queries = yield* Ref.get(deps.activeQueries);
    const query = queries.get(turnId) ?? null;
    if (query === null) {
      return yield* Effect.fail(
        new AgentTurnConflictError({
          detail: 'Turn is not active and cannot be cancelled.',
          sessionId,
          turnId: record.turn.turnId
        })
      );
    }
    const reason = new ProviderCancellationReason({ reason: input.reason ?? 'cancel requested' });
    yield* cancelActiveQuery(query, reason).pipe(
      Effect.mapError(
        (error) =>
          new AgentTurnConflictError({
            detail: error.detail,
            sessionId,
            turnId: record.turn.turnId
          })
      )
    );
    const failure = new AgentTurnFailureRead({
      code: 'cancelled',
      message: reason.reason,
      safeNextAction: null
    });
    const cancelled = yield* makeTerminalTurn({
      turn: record.turn,
      state: 'cancelled',
      events: record.events,
      failure
    });
    yield* removeActiveQuery(deps.activeQueries, turnId);
    const updated = yield* deps.repo.updateRecord(sessionId, turnId, (current) => ({
      ...current,
      turn: cancelled
    }));
    return updated === null ? cancelled : updated.turn;
  });

/** Creates the provider-session reset operation. */
const makeResetProviderSession = (deps: AgentTurnsDependencies): AgentTurnsService['Service']['resetProviderSession'] =>
  Effect.fn('AgentTurnsService.resetProviderSession')(function* (ownerId: UserId, sessionId: SessionId) {
    const sessionRecord = yield* deps.sessions.getRecordForOwner(ownerId, sessionId);
    const providerSessionId = makeProviderSessionId();
    return yield* makeProviderSession(
      sessionId,
      sessionRecord.binding.selectedProviderId,
      providerSessionId,
      'manual provider-session reset requested'
    );
  });

/** Creates the stale-turn recovery operation for startup reconciliation. */
const makeRecoverStale = (deps: AgentTurnsDependencies): AgentTurnsService['Service']['recoverStale'] =>
  Effect.fn('AgentTurnsService.recoverStale')(function* (ownerId: UserId, sessionId: SessionId) {
    yield* deps.sessions.getRecordForOwner(ownerId, sessionId);
    const turns = yield* deps.repo.listBySession(sessionId);
    const active = yield* Ref.get(deps.activeQueries);
    yield* Effect.forEach(
      turns.filter((turn) => isRecoverableTurnState(turn.state)),
      (turn) =>
        active.has(turn.turnId)
          ? Effect.void
          : Effect.gen(function* () {
              const failure = new AgentTurnFailureRead({
                code: 'stale',
                message: 'Turn was active before recovery but no active provider query exists.',
                safeNextAction: 'Start a fresh turn for this Session.'
              });
              const stale = yield* makeTerminalTurn({
                turn,
                state: 'stale',
                events: [],
                failure
              });
              yield* deps.repo.updateRecord(sessionId, turn.turnId, (current) => ({
                ...current,
                turn: stale
              }));
            }),
      { discard: true }
    );
    return yield* deps.repo.listBySession(sessionId);
  });

/** Builds the service operations from resolved layer dependencies. */
const makeAgentTurnsService = (deps: AgentTurnsDependencies): AgentTurnsService['Service'] => {
  const getRecord = makeGetRecord(deps);
  return {
    create: makeCreate(deps),
    list: makeList(deps),
    get: makeGet(getRecord),
    events: makeEvents(getRecord),
    followUp: makeFollowUp(deps, getRecord),
    cancel: makeCancel(deps, getRecord),
    resetProviderSession: makeResetProviderSession(deps),
    recoverStale: makeRecoverStale(deps)
  } as const;
};

/** Service body parameterized by repos, Sessions, and harness provider service. */
export const AgentTurnsServiceBody: Layer.Layer<
  AgentTurnsService,
  never,
  AgentTurnsRepo | SessionsService | AgentProviderService | ActiveTurnQueries
> = Layer.effect(
  AgentTurnsService,
  Effect.gen(function* () {
    const repo = yield* AgentTurnsRepo;
    const sessions = yield* SessionsService;
    const providers = yield* AgentProviderService;
    const activeQueries = yield* ActiveTurnQueries;

    return makeAgentTurnsService({ repo, sessions, providers, activeQueries });
  })
);

/** Live Agent Turn service. */
export const AgentTurnsServiceLive = Layer.provide(AgentTurnsServiceBody, [
  AgentTurnsRepoLive,
  SessionsServiceLive,
  AgentProviderServiceLive,
  ActiveTurnQueries.layer
]);
