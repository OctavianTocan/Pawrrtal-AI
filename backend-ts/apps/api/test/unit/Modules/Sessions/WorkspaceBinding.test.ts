/** Session Workspace binding and turn diagnostic checks. */

import { assert, describe, it } from '@effect/vitest';
import type { UserId } from '@pawrrtal/domain-core';
import { Ids } from '@pawrrtal/domain-core';
import { AgentTurnCreateInput } from '@pawrrtal/domain-core/Modules/AgentTurns/Domain';
import { SessionCreateInput } from '@pawrrtal/domain-core/Modules/Sessions/Domain';
import { Effect, Layer, Schema } from 'effect';
import { AgentTurnsService, AgentTurnsServiceLive } from '@/Modules/AgentTurns/Service';
import { SessionsService, SessionsServiceLive } from '@/Modules/Sessions/Service';

const ownerId: UserId = Schema.decodeSync(Ids.user)('00000000-0000-4000-8000-000000000811');
const firstWorkspaceId = Schema.decodeSync(Ids.workspace)('00000000-0000-4000-8000-000000000812');
const secondWorkspaceId = Schema.decodeSync(Ids.workspace)('00000000-0000-4000-8000-000000000813');
const providerId = Schema.decodeSync(Ids.provider)('deterministic');
const capabilityBoundaryId = Schema.decodeSync(Ids.capabilityBoundary)('base');
const serviceLayer = Layer.mergeAll(SessionsServiceLive, AgentTurnsServiceLive);

describe('WorkspaceBinding', (): void => {
  it.effect('keeps turn Workspace diagnostics scoped to the selected Session Workspace', () =>
    Effect.gen(function* () {
      const sessions = yield* SessionsService;
      const turns = yield* AgentTurnsService;
      const firstSession = yield* sessions.createForOwner(
        ownerId,
        new SessionCreateInput({
          workspaceId: firstWorkspaceId,
          providerId,
          capabilityBoundaryId,
          title: 'First Workspace',
          routeRef: null
        })
      );
      const secondSession = yield* sessions.createForOwner(
        ownerId,
        new SessionCreateInput({
          workspaceId: secondWorkspaceId,
          providerId,
          capabilityBoundaryId,
          title: 'Second Workspace',
          routeRef: null
        })
      );

      const firstTurn = yield* turns.create(
        ownerId,
        firstSession.session.sessionId,
        new AgentTurnCreateInput({
          sessionId: firstSession.session.sessionId,
          workspaceId: firstWorkspaceId,
          providerId: null,
          message: 'same prompt'
        })
      );
      const secondTurn = yield* turns.create(
        ownerId,
        secondSession.session.sessionId,
        new AgentTurnCreateInput({
          sessionId: secondSession.session.sessionId,
          workspaceId: secondWorkspaceId,
          providerId: null,
          message: 'same prompt'
        })
      );

      assert.strictEqual(firstTurn.workspace.workspaceId, firstWorkspaceId);
      assert.strictEqual(secondTurn.workspace.workspaceId, secondWorkspaceId);
      assert.notStrictEqual(firstTurn.workspace.workspaceId, secondTurn.workspace.workspaceId);
      assert.strictEqual(firstTurn.workspace.materializationStatus, 'resolved');
    }).pipe(Effect.provide(serviceLayer))
  );
});
