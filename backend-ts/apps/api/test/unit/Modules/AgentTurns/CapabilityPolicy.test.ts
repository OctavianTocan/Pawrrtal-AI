/** API-level capability denial checks for provider-backed turns. */

import { assert, describe, it } from '@effect/vitest';
import type { UserId } from '@pawrrtal/domain-core';
import { Ids } from '@pawrrtal/domain-core';
import { AgentTurnCreateInput } from '@pawrrtal/domain-core/Modules/AgentTurns/Domain';
import { SessionCreateInput } from '@pawrrtal/domain-core/Modules/Sessions/Domain';
import { Effect, Layer, Schema } from 'effect';
import { AgentTurnsService, AgentTurnsServiceLive } from '@/Modules/AgentTurns/Service';
import { SessionsService, SessionsServiceLive } from '@/Modules/Sessions/Service';

const ownerId: UserId = Schema.decodeSync(Ids.user)('00000000-0000-4000-8000-000000000611');
const workspaceId = Schema.decodeSync(Ids.workspace)('00000000-0000-4000-8000-000000000612');
const providerId = Schema.decodeSync(Ids.provider)('deterministic');
const restrictedBoundaryId = Schema.decodeSync(Ids.capabilityBoundary)('restricted');
const serviceLayer = Layer.mergeAll(SessionsServiceLive, AgentTurnsServiceLive);

describe('AgentTurns capability policy', (): void => {
  it.effect('stores a visible denied turn without starting provider work', () =>
    Effect.gen(function* () {
      const sessions = yield* SessionsService;
      const turns = yield* AgentTurnsService;
      const sessionRecord = yield* sessions.createForOwner(
        ownerId,
        new SessionCreateInput({
          workspaceId,
          providerId,
          capabilityBoundaryId: restrictedBoundaryId,
          title: 'Capability policy proof',
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
          message: 'please run a shell command'
        })
      );
      const events = yield* turns.events(ownerId, sessionRecord.session.sessionId, turn.turnId);

      assert.strictEqual(turn.state, 'failed');
      assert.strictEqual(turn.providerSessionId, null);
      assert.deepEqual(
        events.map((event) => event.type),
        ['capability.denied']
      );
    }).pipe(Effect.provide(serviceLayer))
  );
});
