/** Public Agent Turn errors shared by transports and app services. */

import { Schema } from 'effect';
import { Ids } from '../../Lib/TypeIds';

/** Turn missing or not visible to the caller. */
export class AgentTurnNotFoundError extends Schema.TaggedErrorClass<AgentTurnNotFoundError>()(
  'AgentTurnNotFoundError',
  {
    detail: Schema.String,
    sessionId: Schema.NullOr(Ids.session),
    turnId: Schema.NullOr(Ids.agentTurn)
  },
  { httpApiStatus: 404 }
) {}

/** Turn cannot accept the requested state change. */
export class AgentTurnConflictError extends Schema.TaggedErrorClass<AgentTurnConflictError>()(
  'AgentTurnConflictError',
  {
    detail: Schema.String,
    sessionId: Ids.session,
    turnId: Schema.NullOr(Ids.agentTurn)
  },
  { httpApiStatus: 409 }
) {}

/** Host or provider denied a requested capability. */
export class CapabilityDeniedError extends Schema.TaggedErrorClass<CapabilityDeniedError>()(
  'CapabilityDeniedError',
  {
    detail: Schema.String,
    capabilityId: Ids.capability,
    providerId: Schema.NullOr(Ids.provider),
    safeNextAction: Schema.NullOr(Schema.String)
  },
  { httpApiStatus: 403 }
) {}

/** Turn input failed validation before a provider accepted it. */
export class AgentTurnValidationError extends Schema.TaggedErrorClass<AgentTurnValidationError>()(
  'AgentTurnValidationError',
  {
    detail: Schema.String,
    sessionId: Schema.NullOr(Ids.session),
    providerId: Schema.NullOr(Ids.provider)
  },
  { httpApiStatus: 422 }
) {}
