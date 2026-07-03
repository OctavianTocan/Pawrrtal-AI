/** Provider continuation ownership checks for provider overrides. */

import { assert, describe, it } from '@effect/vitest';
import type { UserId } from '@pawrrtal/domain-core';
import { Ids } from '@pawrrtal/domain-core';
import { AgentTurnCreateInput } from '@pawrrtal/domain-core/Modules/AgentTurns/Domain';
import { SessionCreateInput } from '@pawrrtal/domain-core/Modules/Sessions/Domain';
import { Effect, Layer, Schema } from 'effect';
import { AgentTurnsService, AgentTurnsServiceLive } from '@/Modules/AgentTurns/Service';
import { SessionsService, SessionsServiceLive } from '@/Modules/Sessions/Service';

const ownerId: UserId = Schema.decodeSync(Ids.user)('00000000-0000-4000-8000-000000000341');
const workspaceId = Schema.decodeSync(Ids.workspace)('00000000-0000-4000-8000-000000000342');
const providerId = Schema.decodeSync(Ids.provider)('deterministic');
const capabilityBoundaryId = Schema.decodeSync(Ids.capabilityBoundary)('base');
const serviceLayer = Layer.mergeAll(SessionsServiceLive, AgentTurnsServiceLive);

describe('provider switch ownership', (): void => {
  it.effect('starts an override turn with a fresh provider continuation', () =>
    Effect.gen(function* () {
      const sessions = yield* SessionsService;
      const turns = yield* AgentTurnsService;
      const sessionRecord = yield* sessions.createForOwner(
        ownerId,
        new SessionCreateInput({
          workspaceId,
          providerId,
          capabilityBoundaryId,
          title: 'Provider switch proof',
          routeRef: null
        })
      );

      const first = yield* turns.create(
        ownerId,
        sessionRecord.session.sessionId,
        new AgentTurnCreateInput({
          sessionId: sessionRecord.session.sessionId,
          workspaceId,
          providerId: null,
          message: 'first turn'
        })
      );
      const second = yield* turns.create(
        ownerId,
        sessionRecord.session.sessionId,
        new AgentTurnCreateInput({
          sessionId: sessionRecord.session.sessionId,
          workspaceId,
          providerId,
          message: 'provider override turn'
        })
      );

      assert.strictEqual(first.providerId, providerId);
      assert.strictEqual(second.providerId, providerId);
      assert.notStrictEqual(first.providerSessionId, second.providerSessionId);
    }).pipe(Effect.provide(serviceLayer))
  );
});
