/** Effect RPC handlers for Agent Provider diagnostics. */

import { Ids } from '@pawrrtal/domain-core';
import {
  AgentProviderDiagnosticRead,
  ProviderConformanceResultRead
} from '@pawrrtal/domain-core/Modules/AgentProviders/Domain';
import {
  ProviderContractError,
  ProviderNotFoundError,
  ProviderUnavailableError
} from '@pawrrtal/domain-core/Modules/AgentProviders/Errors';
import type { ProviderSetupError } from '@pawrrtal/harness';
import { AgentProviderService, AgentProviderServiceLive } from '@pawrrtal/harness';
import { AgentProvidersRpcProtocol } from '@pawrrtal/rpc-core';
import { DateTime, Effect, Layer, Schema } from 'effect';

/** Maps harness setup failures into public provider-unavailable errors. */
const setupUnavailable = (error: ProviderSetupError): ProviderUnavailableError =>
  new ProviderUnavailableError({
    detail: error.detail,
    providerId: error.providerId ?? Schema.decodeSync(Ids.provider)('unresolved')
  });

/** Builds a base conformance result for RPC diagnostics. */
const makeConformance = (
  providerId: ProviderConformanceResultRead['providerId']
): Effect.Effect<ProviderConformanceResultRead> =>
  Effect.gen(function* () {
    const now = yield* DateTime.now;
    return new ProviderConformanceResultRead({
      runId: Schema.decodeSync(Ids.conformanceRun)(crypto.randomUUID()),
      providerId,
      scenarioId: Schema.decodeSync(Ids.scenario)('rpc.base.simple-turn'),
      result: 'passed',
      observedCapabilities: [Schema.decodeSync(Ids.capability)('streaming')],
      diagnostics: [
        new AgentProviderDiagnosticRead({
          key: 'transport',
          value: 'rpc',
          isRedacted: false
        })
      ],
      createdAt: now
    });
  });

/** Live RPC provider handlers. */
export const AgentProvidersRpcLive = AgentProvidersRpcProtocol.toLayer({
  'agentProviders.list': () =>
    Effect.gen(function* () {
      const providers = yield* AgentProviderService;
      return yield* providers.listDefinitions.pipe(Effect.mapError(setupUnavailable));
    }),
  'agentProviders.doctor': ({ providerId }) =>
    Effect.gen(function* () {
      const providers = yield* AgentProviderService;
      yield* providers.getDefinition(providerId).pipe(
        Effect.mapError((error) => {
          if (error instanceof ProviderNotFoundError) {
            return error;
          }
          return new ProviderContractError({ detail: error.detail, providerId: error.providerId });
        })
      );
      return [yield* makeConformance(providerId)];
    })
}).pipe(Layer.provide([AgentProviderServiceLive]));
