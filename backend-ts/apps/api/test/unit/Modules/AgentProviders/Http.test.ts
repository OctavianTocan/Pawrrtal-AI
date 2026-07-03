/** Agent Provider public contract tests through the app service boundary. */

import { assert, describe, it } from '@effect/vitest';
import { Ids } from '@pawrrtal/domain-core';
import { AgentProviderRead, ProviderConformanceResultRead } from '@pawrrtal/domain-core/Modules/AgentProviders/Domain';
import { ProviderNotFoundError } from '@pawrrtal/domain-core/Modules/AgentProviders/Errors';
import { Cause, Effect, Exit, Schema } from 'effect';
import { AgentProvidersService, AgentProvidersServiceLive } from '@/Modules/AgentProviders/Service';

const deterministicProviderId = Schema.decodeSync(Ids.provider)('deterministic');
const claudeProviderId = Schema.decodeSync(Ids.provider)('claude-agent-sdk');
const missingProviderId = Schema.decodeSync(Ids.provider)('missing-provider');

describe('AgentProviders HTTP contract service', (): void => {
  it.effect('lists schema-encodable selectable providers', () =>
    Effect.gen(function* () {
      const service = yield* AgentProvidersService;
      const providers = yield* service.list;

      const deterministic = providers.find((provider) => provider.providerId === deterministicProviderId) ?? null;
      const claude = providers.find((provider) => provider.providerId === claudeProviderId) ?? null;

      assert.strictEqual(providers.length, 2);
      assert.isNotNull(deterministic);
      assert.isNotNull(claude);
      assert.strictEqual(Schema.encodeSync(AgentProviderRead)(deterministic as AgentProviderRead).readiness, 'ready');
      assert.strictEqual(Schema.encodeSync(AgentProviderRead)(claude as AgentProviderRead).readiness, 'missingSetup');
    }).pipe(Effect.provide(AgentProvidersServiceLive))
  );

  it.effect('gets the deterministic provider definition', () =>
    Effect.gen(function* () {
      const service = yield* AgentProvidersService;
      const provider = yield* service.get(deterministicProviderId);

      assert.strictEqual(provider.providerId, deterministicProviderId);
      assert.include(provider.capabilities.eventTypes, 'turn.completed');
    }).pipe(Effect.provide(AgentProvidersServiceLive))
  );

  it.effect('returns schema-encodable conformance rows', () =>
    Effect.gen(function* () {
      const service = yield* AgentProvidersService;
      const rows = yield* service.conformance(deterministicProviderId);

      assert.isAtLeast(rows.length, 3);
      assert.strictEqual(
        Schema.encodeSync(ProviderConformanceResultRead)(rows[0] as ProviderConformanceResultRead).result,
        'passed'
      );
    }).pipe(Effect.provide(AgentProvidersServiceLive))
  );

  it.effect('fails with a tagged provider error for missing providers', () =>
    Effect.gen(function* () {
      const service = yield* AgentProvidersService;
      const exit = yield* service.get(missingProviderId).pipe(Effect.exit);

      assert.isTrue(Exit.isFailure(exit));
      if (Exit.isFailure(exit)) {
        const errors = exit.cause.reasons.filter(Cause.isFailReason).map((reason) => reason.error);
        assert.isTrue(errors.some((error) => error instanceof ProviderNotFoundError));
      }
    }).pipe(Effect.provide(AgentProvidersServiceLive))
  );
});
