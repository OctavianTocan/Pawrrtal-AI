/** Effect RPC protocol for provider-backed turn execution and event streams. */

import { Ids } from '@pawrrtal/domain-core';
import { ProviderContractError, ProviderNotReadyError } from '@pawrrtal/domain-core/Modules/AgentProviders/Errors';
import {
  AgentCancellationInput,
  AgentFollowUpInput,
  AgentProviderEventRead,
  AgentTurnCreateInput,
  AgentTurnRead
} from '@pawrrtal/domain-core/Modules/AgentTurns/Domain';
import {
  AgentTurnConflictError,
  AgentTurnNotFoundError,
  CapabilityDeniedError
} from '@pawrrtal/domain-core/Modules/AgentTurns/Errors';
import { SessionNotFoundError } from '@pawrrtal/domain-core/Modules/Sessions/Errors';
import { Schema } from 'effect';
import { Rpc, RpcGroup, RpcSchema } from 'effect/unstable/rpc';

/** Payload for starting a provider-backed turn. */
export class AgentTurnStartPayload extends Schema.Class<AgentTurnStartPayload>('AgentTurnStartPayload')(
  {
    /** Session route for the turn group. */
    sessionId: Ids.session,
    /** Turn creation body. */
    input: AgentTurnCreateInput
  },
  {
    identifier: 'AgentTurnStartPayload',
    title: 'AgentTurnStartPayload',
    description: 'Payload for starting a provider-backed turn over RPC.'
  }
) {}

/** Payload for turn-specific RPC calls. */
export class AgentTurnRefPayload extends Schema.Class<AgentTurnRefPayload>('AgentTurnRefPayload')(
  {
    /** Session that owns the turn. */
    sessionId: Ids.session,
    /** Turn selected by the caller. */
    turnId: Ids.agentTurn
  },
  {
    identifier: 'AgentTurnRefPayload',
    title: 'AgentTurnRefPayload',
    description: 'Session and turn reference payload.'
  }
) {}

/** Payload for follow-up input over RPC. */
export class AgentTurnFollowUpPayload extends Schema.Class<AgentTurnFollowUpPayload>('AgentTurnFollowUpPayload')(
  {
    /** Session that owns the turn. */
    sessionId: Ids.session,
    /** Turn receiving follow-up input. */
    turnId: Ids.agentTurn,
    /** Follow-up input body. */
    input: AgentFollowUpInput
  },
  {
    identifier: 'AgentTurnFollowUpPayload',
    title: 'AgentTurnFollowUpPayload',
    description: 'Payload for sending follow-up input over RPC.'
  }
) {}

/** Payload for cancellation over RPC. */
export class AgentTurnCancelPayload extends Schema.Class<AgentTurnCancelPayload>('AgentTurnCancelPayload')(
  {
    /** Session that owns the turn. */
    sessionId: Ids.session,
    /** Turn selected for cancellation. */
    turnId: Ids.agentTurn,
    /** Cancellation input body. */
    input: AgentCancellationInput
  },
  {
    identifier: 'AgentTurnCancelPayload',
    title: 'AgentTurnCancelPayload',
    description: 'Payload for cancelling a provider-backed turn over RPC.'
  }
) {}

/** Starts or queues one provider-backed turn. */
export class AgentTurnsStart extends Rpc.make('agentTurns.start', {
  payload: AgentTurnStartPayload,
  success: AgentTurnRead,
  error: Schema.Union([SessionNotFoundError, ProviderNotReadyError, ProviderContractError])
}) {}

/** Streams normalized provider events for one turn. */
export class AgentTurnsEvents extends Rpc.make('agentTurns.events', {
  payload: AgentTurnRefPayload,
  success: RpcSchema.Stream(AgentProviderEventRead, Schema.Never),
  error: Schema.Union([SessionNotFoundError, AgentTurnNotFoundError])
}) {}

/** Sends follow-up input to one active turn. */
export class AgentTurnsFollowUp extends Rpc.make('agentTurns.followUp', {
  payload: AgentTurnFollowUpPayload,
  success: AgentTurnRead,
  error: Schema.Union([SessionNotFoundError, AgentTurnNotFoundError, AgentTurnConflictError])
}) {}

/** Requests cancellation for one active turn. */
export class AgentTurnsCancel extends Rpc.make('agentTurns.cancel', {
  payload: AgentTurnCancelPayload,
  success: AgentTurnRead,
  error: Schema.Union([SessionNotFoundError, AgentTurnNotFoundError, CapabilityDeniedError])
}) {}

/** RPC group for provider-backed turn operations. */
export class AgentTurnsRpcProtocol extends RpcGroup.make(
  AgentTurnsStart,
  AgentTurnsEvents,
  AgentTurnsFollowUp,
  AgentTurnsCancel
) {}
