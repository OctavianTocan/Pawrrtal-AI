/** Session history maintenance checks. */

import { assert, describe, it } from '@effect/vitest';
import { Ids } from '@pawrrtal/domain-core';
import { AgentTurnRead } from '@pawrrtal/domain-core/Modules/AgentTurns/Domain';
import { WorkspaceDiagnosticRead } from '@pawrrtal/domain-core/Modules/Sessions/Domain';
import { DateTime, Effect, Schema } from 'effect';
import { HistoryMaintenanceDecision, maintainSessionHistory } from '@/Modules/AgentTurns/HistoryMaintenance';

/** Creates one public turn row for history maintenance tests. */
const makeTurn = (sequence: number): Effect.Effect<AgentTurnRead> =>
  Effect.gen(function* () {
    const now = yield* DateTime.now;
    return new AgentTurnRead({
      turnId: Schema.decodeSync(Ids.agentTurn)(crypto.randomUUID()),
      sessionId: Schema.decodeSync(Ids.session)('00000000-0000-4000-8000-000000000711'),
      providerId: Schema.decodeSync(Ids.provider)('deterministic'),
      providerSessionId: null,
      workspace: new WorkspaceDiagnosticRead({
        workspaceId: Schema.decodeSync(Ids.workspace)('00000000-0000-4000-8000-000000000712'),
        name: 'Workspace 00000000',
        materializationStatus: 'resolved'
      }),
      inputMessageId: Schema.decodeSync(Ids.message)(crypto.randomUUID()),
      state: 'complete',
      sequence,
      lastProgressAt: now,
      failure: null,
      createdAt: now,
      startedAt: now,
      finishedAt: now
    });
  });

describe('HistoryMaintenance', (): void => {
  it.effect('archives old turn history without storing Workspace snapshots', () =>
    Effect.gen(function* () {
      const turns = yield* Effect.all([makeTurn(1), makeTurn(2), makeTurn(3), makeTurn(4)]);
      const decision = yield* maintainSessionHistory(turns, 2);
      const encoded = Schema.encodeSync(HistoryMaintenanceDecision)(decision);

      assert.strictEqual(encoded.archivedTurnCount, 2);
      assert.strictEqual(encoded.storesWorkspaceSnapshot, false);
      assert.include(encoded.summary, 'Archived 2 older turns');
    })
  );
});
