/** Provider query service that resolves adapters through the registry. */

import type { ProviderId } from '@pawrrtal/domain-core';
import type {
  AgentProviderRead,
  ProviderConformanceResultRead
} from '@pawrrtal/domain-core/Modules/AgentProviders/Domain';
import type { ProviderNotFoundError } from '@pawrrtal/domain-core/Modules/AgentProviders/Errors';
import { Context, Effect, Layer } from 'effect';
import { runProviderConformance, validateProviderDefinition } from './Conformance';
import type { AgentProvider, AgentQuery } from './Contract';
import { redactProviderDefinition } from './Diagnostics';
import { ProviderContractHarnessError, ProviderSetupError, ProviderStartError } from './Errors';
import type { ProviderQueryInput } from './InternalDomain';
import { AgentProviderRegistry, AgentProviderRegistryLive } from './Registry';

/** Provider-facing service consumed by API and RPC runtimes. */
export class AgentProviderService extends Context.Service<
  AgentProviderService,
  {
    /** Lists decoded provider definitions. */
    readonly listDefinitions: Effect.Effect<ReadonlyArray<AgentProviderRead>, ProviderSetupError>;

    /** Reads one decoded provider definition. */
    readonly getDefinition: (
      providerId: ProviderId
    ) => Effect.Effect<AgentProviderRead, ProviderNotFoundError | ProviderSetupError>;

    /** Starts one provider query. */
    readonly startQuery: (
      providerId: ProviderId,
      input: ProviderQueryInput
    ) => Effect.Effect<AgentQuery, ProviderNotFoundError | ProviderStartError>;

    /** Runs conformance checks for one provider. */
    readonly runConformance: (
      providerId: ProviderId
    ) => Effect.Effect<
      ReadonlyArray<ProviderConformanceResultRead>,
      ProviderNotFoundError | ProviderContractHarnessError
    >;
  }
>()('@pawrrtal/harness/AgentProviderService') {}

/** Converts provider contract validation failures into provider setup failures. */
const contractSetupFailure = (error: ProviderContractHarnessError): ProviderSetupError =>
  new ProviderSetupError({
    detail: error.detail,
    providerId: error.providerId,
    safeNextAction: error.safeNextAction
  });

/** Converts provider setup failures into provider start failures. */
const setupStartFailure = (error: ProviderSetupError): ProviderStartError =>
  new ProviderStartError({
    detail: error.detail,
    providerId: error.providerId,
    safeNextAction: error.safeNextAction
  });

/**
 * Reads, redacts, and validates a provider definition.
 *
 * @param provider - Provider adapter to describe.
 * @returns Contract-safe public provider definition.
 */
const describeProvider = (provider: AgentProvider): Effect.Effect<AgentProviderRead, ProviderSetupError> =>
  provider.describe.pipe(
    Effect.map(redactProviderDefinition),
    Effect.flatMap(validateProviderDefinition),
    Effect.mapError((error) => (error instanceof ProviderContractHarnessError ? contractSetupFailure(error) : error))
  );

/** Service body parameterized by a provider registry. */
export const AgentProviderServiceBody: Layer.Layer<AgentProviderService, never, AgentProviderRegistry> = Layer.effect(
  AgentProviderService,
  Effect.gen(function* () {
    const registry = yield* AgentProviderRegistry;

    const listDefinitions = registry.list.pipe(
      Effect.flatMap((providers) => Effect.all(providers.map((provider) => describeProvider(provider))))
    );

    const getDefinition = (providerId: ProviderId) =>
      registry.get(providerId).pipe(Effect.flatMap((provider) => describeProvider(provider)));

    const startQuery = (providerId: ProviderId, input: ProviderQueryInput) =>
      registry.get(providerId).pipe(
        Effect.flatMap((provider) =>
          describeProvider(provider).pipe(
            Effect.mapError(setupStartFailure),
            Effect.flatMap((definition) =>
              definition.readiness === 'ready'
                ? provider.query(input)
                : Effect.fail(
                    new ProviderStartError({
                      detail: `Provider ${definition.providerId} is ${definition.readiness}.`,
                      providerId: definition.providerId,
                      safeNextAction: 'Satisfy provider setup or choose a ready provider.'
                    })
                  )
            )
          )
        )
      );

    const runConformanceForProvider = (providerId: ProviderId) =>
      registry.get(providerId).pipe(Effect.flatMap((provider) => runProviderConformance(provider)));

    return { listDefinitions, getDefinition, startQuery, runConformance: runConformanceForProvider } as const;
  })
);

/** Live provider service with built-in registry composition. */
export const AgentProviderServiceLive = Layer.provide(AgentProviderServiceBody, [AgentProviderRegistryLive]);
