/** HTTP/OpenAPI contract for selectable Agent Providers. */

import { Ids } from '@pawrrtal/domain-core';
import { AgentProviderRead, ProviderConformanceResultRead } from '@pawrrtal/domain-core/Modules/AgentProviders/Domain';
import {
  ProviderContractError,
  ProviderNotFoundError,
  ProviderUnavailableError
} from '@pawrrtal/domain-core/Modules/AgentProviders/Errors';
import { Schema } from 'effect';
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from 'effect/unstable/httpapi';
import { AllowedUserMiddlewareService, AuthenticationMiddlewareService } from '../Auth/Api';

/** Authenticated provider diagnostics for `/api/v1/agent-providers`. */
export class AgentProvidersApi extends HttpApiGroup.make('agent-providers')
  .add(
    HttpApiEndpoint.get('list', '/', {
      success: Schema.Array(AgentProviderRead),
      error: ProviderUnavailableError
    })
      .annotate(OpenApi.Summary, 'List agent providers')
      .annotate(OpenApi.Description, 'List selectable Agent Providers and readiness summaries')
  )
  .add(
    HttpApiEndpoint.get('get', '/:provider_id', {
      params: {
        provider_id: Ids.provider
      },
      success: AgentProviderRead,
      error: Schema.Union([ProviderNotFoundError, ProviderUnavailableError])
    })
      .annotate(OpenApi.Summary, 'Get agent provider')
      .annotate(OpenApi.Description, 'Read one Agent Provider definition and diagnostics')
  )
  .add(
    HttpApiEndpoint.get('conformance', '/:provider_id/conformance', {
      params: {
        provider_id: Ids.provider
      },
      success: Schema.Array(ProviderConformanceResultRead),
      error: Schema.Union([ProviderNotFoundError, ProviderContractError])
    })
      .annotate(OpenApi.Summary, 'Get provider conformance')
      .annotate(OpenApi.Description, 'Read latest conformance results for one Agent Provider')
  )
  .middleware(AllowedUserMiddlewareService)
  .middleware(AuthenticationMiddlewareService)
  .prefix('/agent-providers') {}
