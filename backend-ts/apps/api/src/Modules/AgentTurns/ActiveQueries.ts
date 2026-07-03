/** Active provider query handles and drain helpers for Agent Turns. */

import type { AgentTurnId } from '@pawrrtal/domain-core';
import type { AgentTurnRead } from '@pawrrtal/domain-core/Modules/AgentTurns/Domain';
import { AgentTurnFailureRead } from '@pawrrtal/domain-core/Modules/AgentTurns/Domain';
import type { AgentQuery } from '@pawrrtal/harness';
import { collectQueryEvents } from '@pawrrtal/harness';
import { Context, Effect, Layer, Ref } from 'effect';
import type { AgentTurnsRepo } from './Repo';
import { makeTerminalTurn } from './TurnBuilders';

/** In-memory active query handles for the first API-owned runner slice. */
export class ActiveTurnQueries extends Context.Service<
  ActiveTurnQueries,
  Ref.Ref<ReadonlyMap<AgentTurnId, AgentQuery>>
>()('@apps/api/AgentTurns/ActiveTurnQueries') {
  static readonly layer = Layer.effect(ActiveTurnQueries, Ref.make<ReadonlyMap<AgentTurnId, AgentQuery>>(new Map()));
}

/** Removes an active query handle from the in-memory map. */
export const removeActiveQuery = (
  activeQueries: Ref.Ref<ReadonlyMap<AgentTurnId, AgentQuery>>,
  turnId: AgentTurnId
): Effect.Effect<void> =>
  Ref.update(activeQueries, (queries) => {
    const next = new Map(queries);
    next.delete(turnId);
    return next;
  });

/** Records provider stream completion or failure for one running turn. */
export const runQueryToCompletion = (input: {
  readonly repo: AgentTurnsRepo['Service'];
  readonly activeQueries: Ref.Ref<ReadonlyMap<AgentTurnId, AgentQuery>>;
  readonly query: AgentQuery;
  readonly turn: AgentTurnRead;
}): Effect.Effect<void> =>
  collectQueryEvents(input.query).pipe(
    Effect.flatMap((events) =>
      Effect.gen(function* () {
        const terminal = yield* makeTerminalTurn({
          turn: input.turn,
          state: 'complete',
          events,
          failure: null
        });
        yield* input.repo.updateRecord(input.turn.sessionId, input.turn.turnId, (current) => {
          if (current.turn.state === 'cancelled') {
            return current;
          }
          return { ...current, turn: terminal, events };
        });
      })
    ),
    Effect.catchTag('ProviderStreamError', (error) =>
      Effect.gen(function* () {
        const failure = new AgentTurnFailureRead({
          code: error._tag,
          message: error.detail,
          safeNextAction: error.safeNextAction
        });
        const terminal = yield* makeTerminalTurn({
          turn: input.turn,
          state: 'failed',
          events: [],
          failure
        });
        yield* input.repo.updateRecord(input.turn.sessionId, input.turn.turnId, (current) => ({
          ...current,
          turn: current.turn.state === 'cancelled' ? current.turn : terminal
        }));
      })
    ),
    Effect.ensuring(removeActiveQuery(input.activeQueries, input.turn.turnId))
  );
