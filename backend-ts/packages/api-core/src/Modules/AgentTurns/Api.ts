/** HTTP/OpenAPI contract for provider-backed Agent Turns. */

import { Ids } from '@pawrrtal/domain-core';
import { ProviderContractError, ProviderNotReadyError } from '@pawrrtal/domain-core/Modules/AgentProviders/Errors';
import {
  AgentCancellationInput,
  AgentFollowUpInput,
  AgentProviderEventRead,
  AgentTurnCreateInput,
  AgentTurnRead,
  ProviderSessionRead
} from '@pawrrtal/domain-core/Modules/AgentTurns/Domain';
import {
  AgentTurnConflictError,
  AgentTurnNotFoundError,
  CapabilityDeniedError
} from '@pawrrtal/domain-core/Modules/AgentTurns/Errors';
import { SessionNotFoundError } from '@pawrrtal/domain-core/Modules/Sessions/Errors';
import { Schema } from 'effect';
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from 'effect/unstable/httpapi';
import { AllowedUserMiddlewareService, AuthenticationMiddlewareService } from '../Auth/Api';

/** Authenticated agent-turn lifecycle for `/api/v1/sessions/:session_id/agent-turns`. */
export class AgentTurnsApi extends HttpApiGroup.make('agent-turns')
  .add(
    HttpApiEndpoint.post('create', '/', {
      payload: AgentTurnCreateInput,
      params: {
        session_id: Ids.session
      },
      success: AgentTurnRead,
      error: Schema.Union([SessionNotFoundError, ProviderNotReadyError, ProviderContractError])
    })
      .annotate(OpenApi.Summary, 'Create agent turn')
      .annotate(OpenApi.Description, 'Start or queue a provider-backed turn for a Session')
  )
  .add(
    HttpApiEndpoint.get('list', '/', {
      params: {
        session_id: Ids.session
      },
      success: Schema.Array(AgentTurnRead),
      error: SessionNotFoundError
    })
      .annotate(OpenApi.Summary, 'List agent turns')
      .annotate(OpenApi.Description, 'List provider-backed turns for one Session')
  )
  .add(
    HttpApiEndpoint.get('get', '/:turn_id', {
      params: {
        session_id: Ids.session,
        turn_id: Ids.agentTurn
      },
      success: AgentTurnRead,
      error: Schema.Union([SessionNotFoundError, AgentTurnNotFoundError])
    })
      .annotate(OpenApi.Summary, 'Get agent turn')
      .annotate(OpenApi.Description, 'Read one provider-backed turn state')
  )
  .add(
    HttpApiEndpoint.get('events', '/:turn_id/events', {
      params: {
        session_id: Ids.session,
        turn_id: Ids.agentTurn
      },
      success: Schema.Array(AgentProviderEventRead),
      error: Schema.Union([SessionNotFoundError, AgentTurnNotFoundError])
    })
      .annotate(OpenApi.Summary, 'List turn events')
      .annotate(OpenApi.Description, 'Read normalized provider events emitted for one turn')
  )
  .add(
    HttpApiEndpoint.post('followUp', '/:turn_id/follow-ups', {
      params: {
        session_id: Ids.session,
        turn_id: Ids.agentTurn
      },
      payload: AgentFollowUpInput,
      success: AgentTurnRead,
      error: Schema.Union([SessionNotFoundError, AgentTurnNotFoundError, AgentTurnConflictError])
    })
      .annotate(OpenApi.Summary, 'Send turn follow-up')
      .annotate(OpenApi.Description, 'Send follow-up input to an active turn or queue it visibly')
  )
  .add(
    HttpApiEndpoint.post('cancel', '/:turn_id/cancel', {
      params: {
        session_id: Ids.session,
        turn_id: Ids.agentTurn
      },
      payload: AgentCancellationInput,
      success: AgentTurnRead,
      error: Schema.Union([SessionNotFoundError, AgentTurnNotFoundError, AgentTurnConflictError, CapabilityDeniedError])
    })
      .annotate(OpenApi.Summary, 'Cancel agent turn')
      .annotate(OpenApi.Description, 'Request cancellation for one provider-backed turn')
  )
  .add(
    HttpApiEndpoint.post('resetSession', '/provider-session/reset', {
      params: {
        session_id: Ids.session
      },
      success: ProviderSessionRead,
      error: Schema.Union([SessionNotFoundError, ProviderContractError])
    })
      .annotate(OpenApi.Summary, 'Reset provider session')
      .annotate(OpenApi.Description, 'Reset provider-scoped continuation for one Session')
  )
  .middleware(AllowedUserMiddlewareService)
  .middleware(AuthenticationMiddlewareService)
  .prefix('/sessions/:session_id/agent-turns') {}
