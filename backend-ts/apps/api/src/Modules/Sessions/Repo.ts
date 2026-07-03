/** In-memory Session repository port for the first provider-engine slice. */

import type { SessionId, UserId } from '@pawrrtal/domain-core';
import { Ids } from '@pawrrtal/domain-core';
import type { SessionCreateInput, SessionUpdateInput } from '@pawrrtal/domain-core/Modules/Sessions/Domain';
import { AgentSessionBindingRead, SessionRead } from '@pawrrtal/domain-core/Modules/Sessions/Domain';
import { Context, DateTime, Effect, Layer, Ref, Schema } from 'effect';

/** Stored Session plus active provider binding. */
export interface SessionRecord {
  /** Public Session entity. */
  readonly session: SessionRead;
  /** Active provider binding for the Session. */
  readonly binding: AgentSessionBindingRead;
}

/** Mutable in-memory store for Session records. */
class SessionsStore extends Context.Service<SessionsStore, Ref.Ref<ReadonlyArray<SessionRecord>>>()(
  '@apps/api/Sessions/Store'
) {
  static readonly layer = Layer.effect(SessionsStore, Ref.make<ReadonlyArray<SessionRecord>>([]));
}

/** Persistence port for Sessions and their active provider binding. */
export class SessionsRepo extends Context.Service<
  SessionsRepo,
  {
    /** Lists Sessions owned by one user. */
    readonly listByOwner: (ownerId: UserId) => Effect.Effect<ReadonlyArray<SessionRead>>;

    /** Inserts a Session and its initial provider binding. */
    readonly insert: (ownerId: UserId, payload: SessionCreateInput) => Effect.Effect<SessionRecord>;

    /** Gets a Session record owned by one user. */
    readonly getByOwner: (ownerId: UserId, sessionId: SessionId) => Effect.Effect<SessionRecord | null>;

    /** Updates mutable Session metadata. */
    readonly update: (
      ownerId: UserId,
      sessionId: SessionId,
      payload: SessionUpdateInput
    ) => Effect.Effect<SessionRead | null>;

    /** Removes a Session owned by one user. */
    readonly remove: (ownerId: UserId, sessionId: SessionId) => Effect.Effect<boolean>;
  }
>()('@apps/api/Sessions/Repo') {}

/** Decodes a fresh UUID for a new Session. */
const makeSessionId = (): SessionId => Schema.decodeSync(Ids.session)(crypto.randomUUID());

/** In-memory repository body for the first implementation slice. */
export const SessionsRepoBody: Layer.Layer<SessionsRepo, never, SessionsStore> = Layer.effect(
  SessionsRepo,
  Effect.gen(function* () {
    const store = yield* SessionsStore;

    const listByOwner = Effect.fn('SessionsRepo.listByOwner')(function* (ownerId: UserId) {
      const records = yield* Ref.get(store);
      return records.filter((record) => record.session.ownerId === ownerId).map((record) => record.session);
    });

    const insert = Effect.fn('SessionsRepo.insert')(function* (ownerId: UserId, payload: SessionCreateInput) {
      const now = yield* DateTime.now;
      const sessionId = makeSessionId();
      const session = new SessionRead({
        sessionId,
        ownerId,
        workspaceId: payload.workspaceId,
        title: payload.title.trim() || 'Untitled Session',
        routeRef: payload.routeRef,
        createdAt: now,
        updatedAt: now
      });
      const binding = new AgentSessionBindingRead({
        sessionId,
        selectedProviderId: payload.providerId,
        capabilityBoundaryId: payload.capabilityBoundaryId,
        activeProviderSessionId: null,
        status: 'active',
        createdAt: now,
        updatedAt: now
      });
      const record = { session, binding } as const;
      yield* Ref.update(store, (records) => [...records, record]);
      return record;
    });

    const getByOwner = Effect.fn('SessionsRepo.getByOwner')(function* (ownerId: UserId, sessionId: SessionId) {
      const records = yield* Ref.get(store);
      return (
        records.find((record) => record.session.ownerId === ownerId && record.session.sessionId === sessionId) ?? null
      );
    });

    const update = Effect.fn('SessionsRepo.update')(function* (
      ownerId: UserId,
      sessionId: SessionId,
      payload: SessionUpdateInput
    ) {
      const records = yield* Ref.get(store);
      const record =
        records.find(
          (candidate) => candidate.session.ownerId === ownerId && candidate.session.sessionId === sessionId
        ) ?? null;
      if (record === null) {
        return null;
      }

      const now = yield* DateTime.now;
      const session = new SessionRead({
        sessionId: record.session.sessionId,
        ownerId: record.session.ownerId,
        workspaceId: record.session.workspaceId,
        title: payload.title === null ? record.session.title : payload.title.trim() || record.session.title,
        routeRef: payload.routeRef === null ? record.session.routeRef : payload.routeRef,
        createdAt: record.session.createdAt,
        updatedAt: now
      });
      const next = records.map((candidate) =>
        candidate.session.sessionId === sessionId ? { session, binding: candidate.binding } : candidate
      );
      yield* Ref.set(store, next);
      return session;
    });

    const remove = Effect.fn('SessionsRepo.remove')(function* (ownerId: UserId, sessionId: SessionId) {
      const records = yield* Ref.get(store);
      const next = records.filter(
        (record) => !(record.session.ownerId === ownerId && record.session.sessionId === sessionId)
      );
      if (next.length === records.length) {
        return false;
      }
      yield* Ref.set(store, next);
      return true;
    });

    return { listByOwner, insert, getByOwner, update, remove } as const;
  })
);

/** Live in-memory Session repo. */
export const SessionsRepoLive: Layer.Layer<SessionsRepo> = Layer.provide(SessionsRepoBody, [SessionsStore.layer]);
