/** Live HTTP handlers for provider-backed Agent Turns. */

import { Api } from '@pawrrtal/api-core';
import { CurrentUser } from '@pawrrtal/api-core/Modules/Auth/Domain';
import type { UserId } from '@pawrrtal/domain-core';
import { Ids } from '@pawrrtal/domain-core';
import { ProviderFollowUpInput } from '@pawrrtal/harness';
import { Effect, Layer, Schema } from 'effect';
import { HttpApiBuilder } from 'effect/unstable/httpapi';
import { HttpAllowedUserLive, HttpAuthLive } from '../Authentication/Http';
import { AgentTurnsService, AgentTurnsServiceLive } from './Service';

/** Reads the authenticated user id as a domain-core `UserId`. */
const currentOwnerId: Effect.Effect<UserId, never, CurrentUser> = Effect.gen(function* () {
  const user = yield* CurrentUser;
  return Schema.decodeSync(Ids.user)(user.id);
});

/** Agent Turn route handlers. */
export const HttpAgentTurnsLive = HttpApiBuilder.group(
  Api,
  'agent-turns',
  Effect.fn(function* (handlers) {
    const service = yield* AgentTurnsService;

    return handlers
      .handle(
        'create',
        Effect.fn(function* ({ params, payload }) {
          const ownerId = yield* currentOwnerId;
          return yield* service.create(ownerId, params.session_id, payload);
        })
      )
      .handle(
        'list',
        Effect.fn(function* ({ params }) {
          const ownerId = yield* currentOwnerId;
          return yield* service.list(ownerId, params.session_id);
        })
      )
      .handle(
        'get',
        Effect.fn(function* ({ params }) {
          const ownerId = yield* currentOwnerId;
          return yield* service.get(ownerId, params.session_id, params.turn_id);
        })
      )
      .handle(
        'events',
        Effect.fn(function* ({ params }) {
          const ownerId = yield* currentOwnerId;
          return yield* service.events(ownerId, params.session_id, params.turn_id);
        })
      )
      .handle(
        'followUp',
        Effect.fn(function* ({ params, payload }) {
          const ownerId = yield* currentOwnerId;
          return yield* service.followUp(
            ownerId,
            params.session_id,
            params.turn_id,
            new ProviderFollowUpInput({ message: payload.message })
          );
        })
      )
      .handle(
        'cancel',
        Effect.fn(function* ({ params, payload }) {
          const ownerId = yield* currentOwnerId;
          return yield* service.cancel(ownerId, params.session_id, params.turn_id, payload);
        })
      )
      .handle(
        'resetSession',
        Effect.fn(function* ({ params }) {
          const ownerId = yield* currentOwnerId;
          return yield* service.resetProviderSession(ownerId, params.session_id);
        })
      );
  })
).pipe(Layer.provide([AgentTurnsServiceLive, HttpAuthLive, HttpAllowedUserLive]));
