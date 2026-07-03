/** Session business service for provider-backed Pawrrtal Sessions. */

import type { SessionId, UserId } from '@pawrrtal/domain-core';
import type {
  SessionCreateInput,
  SessionRead,
  SessionUpdateInput
} from '@pawrrtal/domain-core/Modules/Sessions/Domain';
import { SessionNotFoundError } from '@pawrrtal/domain-core/Modules/Sessions/Errors';
import { Context, Effect, Layer } from 'effect';
import type { SessionRecord } from './Repo';
import { SessionsRepo, SessionsRepoLive } from './Repo';

/** Session service scoped by authenticated owner id. */
export class SessionsService extends Context.Service<
  SessionsService,
  {
    /** Lists Sessions owned by one user. */
    readonly listForOwner: (ownerId: UserId) => Effect.Effect<ReadonlyArray<SessionRead>>;

    /** Creates a Session owned by one user. */
    readonly createForOwner: (ownerId: UserId, payload: SessionCreateInput) => Effect.Effect<SessionRecord>;

    /** Reads a Session record or fails with a public not-found error. */
    readonly getRecordForOwner: (
      ownerId: UserId,
      sessionId: SessionId
    ) => Effect.Effect<SessionRecord, SessionNotFoundError>;

    /** Reads one Session or fails with a public not-found error. */
    readonly getForOwner: (ownerId: UserId, sessionId: SessionId) => Effect.Effect<SessionRead, SessionNotFoundError>;

    /** Updates mutable Session metadata. */
    readonly updateForOwner: (
      ownerId: UserId,
      sessionId: SessionId,
      payload: SessionUpdateInput
    ) => Effect.Effect<SessionRead, SessionNotFoundError>;

    /** Removes a Session owned by one user. */
    readonly removeForOwner: (ownerId: UserId, sessionId: SessionId) => Effect.Effect<void, SessionNotFoundError>;
  }
>()('@apps/api/Sessions/Service') {}

/** Service body parameterized by the Session repository. */
export const SessionsServiceBody: Layer.Layer<SessionsService, never, SessionsRepo> = Layer.effect(
  SessionsService,
  Effect.gen(function* () {
    const repo = yield* SessionsRepo;

    const listForOwner = Effect.fn('SessionsService.listForOwner')((ownerId: UserId) => repo.listByOwner(ownerId));

    const createForOwner = Effect.fn('SessionsService.createForOwner')((ownerId: UserId, payload: SessionCreateInput) =>
      repo.insert(ownerId, payload)
    );

    const getRecordForOwner = Effect.fn('SessionsService.getRecordForOwner')(function* (
      ownerId: UserId,
      sessionId: SessionId
    ) {
      const record = yield* repo.getByOwner(ownerId, sessionId);
      if (record === null) {
        return yield* Effect.fail(new SessionNotFoundError({ detail: 'Session was not found.', sessionId }));
      }
      return record;
    });

    const getForOwner = Effect.fn('SessionsService.getForOwner')(function* (ownerId: UserId, sessionId: SessionId) {
      const record = yield* getRecordForOwner(ownerId, sessionId);
      return record.session;
    });

    const updateForOwner = Effect.fn('SessionsService.updateForOwner')(function* (
      ownerId: UserId,
      sessionId: SessionId,
      payload: SessionUpdateInput
    ) {
      const session = yield* repo.update(ownerId, sessionId, payload);
      if (session === null) {
        return yield* Effect.fail(new SessionNotFoundError({ detail: 'Session was not found.', sessionId }));
      }
      return session;
    });

    const removeForOwner = Effect.fn('SessionsService.removeForOwner')(function* (
      ownerId: UserId,
      sessionId: SessionId
    ) {
      const removed = yield* repo.remove(ownerId, sessionId);
      if (!removed) {
        return yield* Effect.fail(new SessionNotFoundError({ detail: 'Session was not found.', sessionId }));
      }
    });

    return { listForOwner, createForOwner, getRecordForOwner, getForOwner, updateForOwner, removeForOwner } as const;
  })
);

/** Live Session service with in-memory persistence. */
export const SessionsServiceLive: Layer.Layer<SessionsService> = Layer.provide(SessionsServiceBody, [SessionsRepoLive]);
