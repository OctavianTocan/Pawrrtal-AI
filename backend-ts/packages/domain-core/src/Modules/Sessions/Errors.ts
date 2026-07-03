/** Public Session errors shared by HTTP, RPC, and app services. */

import { Schema } from 'effect';
import { Ids } from '../../Lib/TypeIds';

/** Session missing or not visible to the caller. */
export class SessionNotFoundError extends Schema.TaggedErrorClass<SessionNotFoundError>()(
  'SessionNotFoundError',
  {
    detail: Schema.String,
    sessionId: Schema.NullOr(Ids.session)
  },
  { httpApiStatus: 404 }
) {}

/** Session cannot accept the requested state change. */
export class SessionConflictError extends Schema.TaggedErrorClass<SessionConflictError>()(
  'SessionConflictError',
  {
    detail: Schema.String,
    sessionId: Schema.NullOr(Ids.session)
  },
  { httpApiStatus: 409 }
) {}

/** Session invocation target is incomplete or ambiguous. */
export class SessionInvocationError extends Schema.TaggedErrorClass<SessionInvocationError>()(
  'SessionInvocationError',
  {
    detail: Schema.String,
    sessionId: Schema.NullOr(Ids.session),
    workspaceId: Schema.NullOr(Ids.workspace),
    providerId: Schema.NullOr(Ids.provider)
  },
  { httpApiStatus: 422 }
) {}
