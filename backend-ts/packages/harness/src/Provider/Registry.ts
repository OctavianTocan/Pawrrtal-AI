/** Provider registry composition and lookup service. */

import type { ProviderId } from '@pawrrtal/domain-core';
import { ProviderNotFoundError } from '@pawrrtal/domain-core/Modules/AgentProviders/Errors';
import { Context, Effect, Layer } from 'effect';
import { makeClaudeAgentSdkProvider } from '../Providers/ClaudeAgentSdk';
import { makeDeterministicProvider } from '../Providers/Deterministic';
import { claudeAgentSdkProviderConfig, deterministicProviderConfig } from './Config';
import type { AgentProvider } from './Contract';

/** Provider registry used by apps/api and apps/rpc. */
export class AgentProviderRegistry extends Context.Service<
  AgentProviderRegistry,
  {
    /** Lists registered provider adapters. */
    readonly list: Effect.Effect<ReadonlyArray<AgentProvider>>;

    /** Reads one registered provider adapter by id. */
    readonly get: (providerId: ProviderId) => Effect.Effect<AgentProvider, ProviderNotFoundError>;
  }
>()('@pawrrtal/harness/AgentProviderRegistry') {}

/** Creates a registry service from provider adapters. */
export const makeProviderRegistry = (providers: ReadonlyArray<AgentProvider>): AgentProviderRegistry['Service'] => ({
  list: Effect.succeed(providers),
  get: (providerId: ProviderId) =>
    Effect.gen(function* () {
      const provider = providers.find((candidate) => candidate.providerId === providerId) ?? null;
      if (provider === null) {
        return yield* Effect.fail(
          new ProviderNotFoundError({
            detail: 'Provider is not registered.',
            providerId
          })
        );
      }
      return provider;
    })
});

/** Registry layer with built-in providers selected by Effect Config. */
export const AgentProviderRegistryLive = Layer.effect(
  AgentProviderRegistry,
  Effect.gen(function* () {
    const deterministicConfig = yield* deterministicProviderConfig;
    const claudeConfig = yield* claudeAgentSdkProviderConfig;
    const providers = [
      ...(deterministicConfig.enabled ? [makeDeterministicProvider(deterministicConfig)] : []),
      makeClaudeAgentSdkProvider(claudeConfig)
    ];
    return makeProviderRegistry(providers);
  })
);
