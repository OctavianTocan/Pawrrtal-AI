/** Agent Provider app service backed by the harness provider registry. */

import type { ProviderId } from '@pawrrtal/domain-core';
import { Ids } from '@pawrrtal/domain-core';
import type {
  AgentProviderRead,
  ProviderConformanceResultRead
} from '@pawrrtal/domain-core/Modules/AgentProviders/Domain';
import {
  ProviderContractError,
  ProviderNotFoundError,
  ProviderUnavailableError
} from '@pawrrtal/domain-core/Modules/AgentProviders/Errors';
import type { ProviderContractHarnessError, ProviderSetupError } from '@pawrrtal/harness';
import { AgentProviderService } from '@pawrrtal/harness';
import { Context, Effect, Layer, Schema } from 'effect';
import { AppAgentProviderServiceLive } from './Registry';

/** Application-facing provider service. */
export class AgentProvidersService extends Context.Service<
  AgentProvidersService,
  {
    /** Lists decoded providers visible to operators. */
    readonly list: Effect.Effect<ReadonlyArray<AgentProviderRead>, ProviderUnavailableError>;

    /** Reads one decoded provider definition. */
    readonly get: (
      providerId: ProviderId
    ) => Effect.Effect<AgentProviderRead, ProviderNotFoundError | ProviderUnavailableError>;

    /** Reads latest conformance summaries for one provider. */
    readonly conformance: (
      providerId: ProviderId
    ) => Effect.Effect<ReadonlyArray<ProviderConformanceResultRead>, ProviderNotFoundError | ProviderContractError>;
  }
>()('@apps/api/AgentProviders/Service') {}

/** Maps provider setup failures into public unavailable errors. */
const setupUnavailable = (error: ProviderSetupError): ProviderUnavailableError =>
  new ProviderUnavailableError({
    detail: error.detail,
    providerId: error.providerId ?? Schema.decodeSync(Ids.provider)('unresolved')
  });

/** Maps harness contract failures into public provider contract errors. */
const contractUnavailable = (error: ProviderContractHarnessError | ProviderSetupError): ProviderContractError =>
  new ProviderContractError({
    detail: error.detail,
    providerId: error.providerId
  });

/** Service body parameterized by harness provider service. */
export const AgentProvidersServiceBody: Layer.Layer<AgentProvidersService, never, AgentProviderService> = Layer.effect(
  AgentProvidersService,
  Effect.gen(function* () {
    const providers = yield* AgentProviderService;

    const list = providers.listDefinitions.pipe(Effect.mapError(setupUnavailable));

    const get = (providerId: ProviderId) =>
      providers.getDefinition(providerId).pipe(
        Effect.mapError((error) => {
          if (error instanceof ProviderNotFoundError) {
            return error;
          }
          return setupUnavailable(error);
        })
      );

    const conformance = Effect.fn('AgentProvidersService.conformance')(function* (providerId: ProviderId) {
      return yield* providers.runConformance(providerId).pipe(
        Effect.mapError((error) => {
          if (error instanceof ProviderNotFoundError) {
            return error;
          }
          return contractUnavailable(error);
        })
      );
    });

    return { list, get, conformance } as const;
  })
);

/** Live provider service using the harness registry. */
export const AgentProvidersServiceLive = Layer.provide(AgentProvidersServiceBody, [AppAgentProviderServiceLive]);
