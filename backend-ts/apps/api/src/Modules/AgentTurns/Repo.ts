/** In-memory Agent Turn repository port for normalized provider state. */

import type { AgentTurnId, SessionId } from '@pawrrtal/domain-core';
import type {
  AgentProviderEventRead,
  AgentTurnRead,
  ProviderSessionRead
} from '@pawrrtal/domain-core/Modules/AgentTurns/Domain';
import { Context, Effect, Layer, Ref } from 'effect';

/** Stored turn, provider continuation, and normalized events. */
export interface AgentTurnRecord {
  /** Public turn state. */
  readonly turn: AgentTurnRead;
  /** Provider-scoped continuation record for this turn, or null when the provider never started. */
  readonly providerSession: ProviderSessionRead | null;
  /** Normalized events emitted for this turn. */
  readonly events: ReadonlyArray<AgentProviderEventRead>;
}

/** Mutable in-memory store for turn records. */
class AgentTurnsStore extends Context.Service<AgentTurnsStore, Ref.Ref<ReadonlyArray<AgentTurnRecord>>>()(
  '@apps/api/AgentTurns/Store'
) {
  static readonly layer = Layer.effect(AgentTurnsStore, Ref.make<ReadonlyArray<AgentTurnRecord>>([]));
}

/** Persistence port for turns, provider sessions, and normalized events. */
export class AgentTurnsRepo extends Context.Service<
  AgentTurnsRepo,
  {
    /** Computes the next monotonic turn sequence for a Session. */
    readonly nextSequence: (sessionId: SessionId) => Effect.Effect<number>;

    /** Persists a completed provider turn result. */
    readonly insertResult: (record: AgentTurnRecord) => Effect.Effect<AgentTurnRecord>;

    /** Updates a stored turn record when it still exists. */
    readonly updateRecord: (
      sessionId: SessionId,
      turnId: AgentTurnId,
      update: (record: AgentTurnRecord) => AgentTurnRecord
    ) => Effect.Effect<AgentTurnRecord | null>;

    /** Lists turns for one Session. */
    readonly listBySession: (sessionId: SessionId) => Effect.Effect<ReadonlyArray<AgentTurnRead>>;

    /** Reads one turn record. */
    readonly get: (sessionId: SessionId, turnId: AgentTurnId) => Effect.Effect<AgentTurnRecord | null>;

    /** Reads normalized events for one turn. */
    readonly events: (
      sessionId: SessionId,
      turnId: AgentTurnId
    ) => Effect.Effect<ReadonlyArray<AgentProviderEventRead> | null>;

    /** Reads the latest provider continuation for one Session. */
    readonly latestProviderSession: (sessionId: SessionId) => Effect.Effect<ProviderSessionRead | null>;
  }
>()('@apps/api/AgentTurns/Repo') {}

/** In-memory turn repository body. */
export const AgentTurnsRepoBody: Layer.Layer<AgentTurnsRepo, never, AgentTurnsStore> = Layer.effect(
  AgentTurnsRepo,
  Effect.gen(function* () {
    const store = yield* AgentTurnsStore;

    const nextSequence = Effect.fn('AgentTurnsRepo.nextSequence')(function* (sessionId: SessionId) {
      const records = yield* Ref.get(store);
      return records.filter((record) => record.turn.sessionId === sessionId).length + 1;
    });

    const insertResult = Effect.fn('AgentTurnsRepo.insertResult')(function* (record: AgentTurnRecord) {
      yield* Ref.update(store, (records) => [...records, record]);
      return record;
    });

    const updateRecord = Effect.fn('AgentTurnsRepo.updateRecord')(function* (
      sessionId: SessionId,
      turnId: AgentTurnId,
      update: (record: AgentTurnRecord) => AgentTurnRecord
    ) {
      return yield* Ref.modify(store, (records) => {
        const index = records.findIndex(
          (record) => record.turn.sessionId === sessionId && record.turn.turnId === turnId
        );
        if (index < 0) {
          return [null, records] as const;
        }
        const current = records[index] ?? null;
        if (current === null) {
          return [null, records] as const;
        }
        const next = update(current);
        return [next, [...records.slice(0, index), next, ...records.slice(index + 1)]] as const;
      });
    });

    const listBySession = Effect.fn('AgentTurnsRepo.listBySession')(function* (sessionId: SessionId) {
      const records = yield* Ref.get(store);
      return records
        .filter((record) => record.turn.sessionId === sessionId)
        .map((record) => record.turn)
        .sort((left, right) => left.sequence - right.sequence);
    });

    const get = Effect.fn('AgentTurnsRepo.get')(function* (sessionId: SessionId, turnId: AgentTurnId) {
      const records = yield* Ref.get(store);
      return records.find((record) => record.turn.sessionId === sessionId && record.turn.turnId === turnId) ?? null;
    });

    const events = Effect.fn('AgentTurnsRepo.events')(function* (sessionId: SessionId, turnId: AgentTurnId) {
      const record = yield* get(sessionId, turnId);
      return record === null ? null : record.events;
    });

    const latestProviderSession = Effect.fn('AgentTurnsRepo.latestProviderSession')(function* (sessionId: SessionId) {
      const records = yield* Ref.get(store);
      const sessionRecords = records
        .filter((record) => record.turn.sessionId === sessionId && record.providerSession !== null)
        .sort((left, right) => right.turn.sequence - left.turn.sequence);
      const latest = sessionRecords[0] ?? null;
      return latest === null ? null : latest.providerSession;
    });

    return { nextSequence, insertResult, updateRecord, listBySession, get, events, latestProviderSession } as const;
  })
);

/** Live in-memory Agent Turn repo. */
export const AgentTurnsRepoLive: Layer.Layer<AgentTurnsRepo> = Layer.provide(AgentTurnsRepoBody, [
  AgentTurnsStore.layer
]);
