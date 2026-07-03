/** Live HTTP handlers for Pawrrtal Sessions. */

import { Api } from '@pawrrtal/api-core';
import { CurrentUser } from '@pawrrtal/api-core/Modules/Auth/Domain';
import type { UserId } from '@pawrrtal/domain-core';
import { Ids } from '@pawrrtal/domain-core';
import { Effect, Layer, Schema } from 'effect';
import { HttpApiBuilder } from 'effect/unstable/httpapi';
import { HttpAllowedUserLive, HttpAuthLive } from '../Authentication/Http';
import { SessionsService, SessionsServiceLive } from './Service';

/** Reads the authenticated user id as a domain-core `UserId`. */
const currentOwnerId: Effect.Effect<UserId, never, CurrentUser> = Effect.gen(function* () {
  const user = yield* CurrentUser;
  return Schema.decodeSync(Ids.user)(user.id);
});

/** Session route handlers. */
export const HttpSessionsLive = HttpApiBuilder.group(
  Api,
  'sessions',
  Effect.fn(function* (handlers) {
    const service = yield* SessionsService;

    return handlers
      .handle(
        'list',
        Effect.fn(function* () {
          const ownerId = yield* currentOwnerId;
          return yield* service.listForOwner(ownerId);
        })
      )
      .handle(
        'create',
        Effect.fn(function* ({ payload }) {
          const ownerId = yield* currentOwnerId;
          const record = yield* service.createForOwner(ownerId, payload);
          return record.session;
        })
      )
      .handle(
        'get',
        Effect.fn(function* ({ params }) {
          const ownerId = yield* currentOwnerId;
          return yield* service.getForOwner(ownerId, params.session_id);
        })
      )
      .handle(
        'update',
        Effect.fn(function* ({ params, payload }) {
          const ownerId = yield* currentOwnerId;
          return yield* service.updateForOwner(ownerId, params.session_id, payload);
        })
      )
      .handle(
        'remove',
        Effect.fn(function* ({ params }) {
          const ownerId = yield* currentOwnerId;
          return yield* service.removeForOwner(ownerId, params.session_id);
        })
      );
  })
).pipe(Layer.provide([SessionsServiceLive, HttpAuthLive, HttpAllowedUserLive]));
