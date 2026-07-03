/** RPC app layer exports for provider-backed Sessions. */

import { Layer } from 'effect';
import { AgentProvidersRpcLive } from './Modules/AgentProviders/Rpc';
import { AgentTurnsRpcLive } from './Modules/AgentTurns/Rpc';

/** Merged RPC handler layers. */
export const RpcAppLive = Layer.mergeAll(AgentProvidersRpcLive, AgentTurnsRpcLive);
