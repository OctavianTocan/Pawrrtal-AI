/** Workspace materialization isolation checks. */

import { assert, describe, it } from '@effect/vitest';
import { Ids } from '@pawrrtal/domain-core';
import { Effect, Schema } from 'effect';
import { materializeWorkspaceForTurn, WorkspaceMaterializationInput } from '../src';

const firstWorkspaceId = Schema.decodeSync(Ids.workspace)('00000000-0000-4000-8000-000000000801');
const secondWorkspaceId = Schema.decodeSync(Ids.workspace)('00000000-0000-4000-8000-000000000802');
const boundaryId = Schema.decodeSync(Ids.capabilityBoundary)('base');

describe('WorkspaceIsolation', (): void => {
  it.effect(
    'materializes distinct provider summaries for distinct Workspaces',
    (): Effect.Effect<void> =>
      Effect.gen(function* () {
        const first = yield* materializeWorkspaceForTurn(
          new WorkspaceMaterializationInput({
            workspaceId: firstWorkspaceId,
            capabilityBoundaryId: boundaryId
          })
        );
        const second = yield* materializeWorkspaceForTurn(
          new WorkspaceMaterializationInput({
            workspaceId: secondWorkspaceId,
            capabilityBoundaryId: boundaryId
          })
        );

        assert.notStrictEqual(first.workspaceId, second.workspaceId);
        assert.notStrictEqual(first.instructionDigest, second.instructionDigest);
      })
  );
});
