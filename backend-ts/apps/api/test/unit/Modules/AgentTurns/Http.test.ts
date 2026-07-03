/** Session and Agent Turn public contract tests through the app services. */

import { assert, describe, it } from '@effect/vitest';
import type { UserId } from '@pawrrtal/domain-core';
import { Ids } from '@pawrrtal/domain-core';
import {
  AgentProviderEventRead,
  AgentTurnCreateInput,
  AgentTurnRead
} from '@pawrrtal/domain-core/Modules/AgentTurns/Domain';
import { SessionCreateInput } from '@pawrrtal/domain-core/Modules/Sessions/Domain';
import { Effect, Layer, Schema } from 'effect';
import { AgentTurnsService, AgentTurnsServiceLive } from '@/Modules/AgentTurns/Service';
import { SessionsService, SessionsServiceLive } from '@/Modules/Sessions/Service';

const ownerId: UserId = Schema.decodeSync(Ids.user)('00000000-0000-4000-8000-000000000301');
const workspaceId = Schema.decodeSync(Ids.workspace)('00000000-0000-4000-8000-000000000302');
const providerId = Schema.decodeSync(Ids.provider)('deterministic');
const capabilityBoundaryId = Schema.decodeSync(Ids.capabilityBoundary)('base');
const serviceLayer = Layer.mergeAll(SessionsServiceLive, AgentTurnsServiceLive);

describe('AgentTurns HTTP contract service', (): void => {
  it.effect('creates a Session, runs a deterministic turn, and reads normalized events', () =>
    Effect.gen(function* () {
      const sessions = yield* SessionsService;
      const turns = yield* AgentTurnsService;
      const sessionRecord = yield* sessions.createForOwner(
        ownerId,
        new SessionCreateInput({
          workspaceId,
          providerId,
          capabilityBoundaryId,
          title: 'Deterministic proof',
          routeRef: null
        })
      );

      const turn = yield* turns.create(
        ownerId,
        sessionRecord.session.sessionId,
        new AgentTurnCreateInput({
          sessionId: sessionRecord.session.sessionId,
          workspaceId,
          providerId: null,
          message: 'hello from api contract test'
        })
      );
      yield* Effect.sleep('10 millis');
      const completed = yield* turns.get(ownerId, sessionRecord.session.sessionId, turn.turnId);
      const events = yield* turns.events(ownerId, sessionRecord.session.sessionId, turn.turnId);

      assert.strictEqual(Schema.encodeSync(AgentTurnRead)(turn).state, 'running');
      assert.strictEqual(Schema.encodeSync(AgentTurnRead)(completed).state, 'complete');
      assert.deepEqual(
        events.map((event) => event.type),
        ['turn.started', 'activity', 'answer.completed', 'turn.completed']
      );
      assert.strictEqual(Schema.encodeSync(Schema.Array(AgentProviderEventRead))(events).length, 4);
    }).pipe(Effect.provide(serviceLayer))
  );
});
