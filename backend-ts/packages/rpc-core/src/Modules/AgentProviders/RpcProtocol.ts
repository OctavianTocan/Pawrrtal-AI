/** Effect RPC protocol for Agent Provider diagnostics and conformance. */

import { Ids } from '@pawrrtal/domain-core';
import { AgentProviderRead, ProviderConformanceResultRead } from '@pawrrtal/domain-core/Modules/AgentProviders/Domain';
import {
  ProviderContractError,
  ProviderNotFoundError,
  ProviderUnavailableError
} from '@pawrrtal/domain-core/Modules/AgentProviders/Errors';
import { Schema } from 'effect';
import { Rpc, RpcGroup } from 'effect/unstable/rpc';

/** Provider id payload for provider-specific RPC calls. */
export class ProviderIdPayload extends Schema.Class<ProviderIdPayload>('ProviderIdPayload')(
  {
    /** Provider id selected by the caller. */
    providerId: Ids.provider
  },
  {
    identifier: 'ProviderIdPayload',
    title: 'ProviderIdPayload',
    description: 'Provider id payload for Agent Provider RPC calls.'
  }
) {}

/** Lists selectable providers. */
export class AgentProvidersList extends Rpc.make('agentProviders.list', {
  success: Schema.Array(AgentProviderRead),
  error: ProviderUnavailableError
}) {}

/** Reads conformance diagnostics for one provider. */
export class AgentProvidersDoctor extends Rpc.make('agentProviders.doctor', {
  payload: ProviderIdPayload,
  success: Schema.Array(ProviderConformanceResultRead),
  error: Schema.Union([ProviderNotFoundError, ProviderContractError])
}) {}

/** RPC group for provider diagnostics. */
export class AgentProvidersRpcProtocol extends RpcGroup.make(AgentProvidersList, AgentProvidersDoctor) {}
