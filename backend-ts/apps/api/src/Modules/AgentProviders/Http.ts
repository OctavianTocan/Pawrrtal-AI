/** Live HTTP handlers for Agent Provider diagnostics. */

import { Api } from '@pawrrtal/api-core';
import { Effect, Layer } from 'effect';
import { HttpApiBuilder } from 'effect/unstable/httpapi';
import { HttpAllowedUserLive, HttpAuthLive } from '../Authentication/Http';
import { AgentProvidersService, AgentProvidersServiceLive } from './Service';

/** Agent Provider route handlers. */
export const HttpAgentProvidersLive = HttpApiBuilder.group(
  Api,
  'agent-providers',
  Effect.fn(function* (handlers) {
    const service = yield* AgentProvidersService;

    return handlers
      .handle(
        'list',
        Effect.fn(function* () {
          return yield* service.list;
        })
      )
      .handle(
        'get',
        Effect.fn(function* ({ params }) {
          return yield* service.get(params.provider_id);
        })
      )
      .handle(
        'conformance',
        Effect.fn(function* ({ params }) {
          return yield* service.conformance(params.provider_id);
        })
      );
  })
).pipe(Layer.provide([AgentProvidersServiceLive, HttpAuthLive, HttpAllowedUserLive]));
