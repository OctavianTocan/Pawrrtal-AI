/** Public Agent Provider errors shared by transports and app services. */

import { Schema } from 'effect';
import { Ids } from '../../Lib/TypeIds';

/** Provider id is absent or hidden from the caller. */
export class ProviderNotFoundError extends Schema.TaggedErrorClass<ProviderNotFoundError>()(
  'ProviderNotFoundError',
  {
    detail: Schema.String,
    providerId: Schema.NullOr(Ids.provider)
  },
  { httpApiStatus: 404 }
) {}

/** Provider exists but cannot run in the current environment. */
export class ProviderUnavailableError extends Schema.TaggedErrorClass<ProviderUnavailableError>()(
  'ProviderUnavailableError',
  {
    detail: Schema.String,
    providerId: Ids.provider
  },
  { httpApiStatus: 503 }
) {}

/** Provider is configured but not ready for a turn. */
export class ProviderNotReadyError extends Schema.TaggedErrorClass<ProviderNotReadyError>()(
  'ProviderNotReadyError',
  {
    detail: Schema.String,
    providerId: Ids.provider
  },
  { httpApiStatus: 503 }
) {}

/** Provider definition failed the shared contract. */
export class ProviderContractError extends Schema.TaggedErrorClass<ProviderContractError>()(
  'ProviderContractError',
  {
    detail: Schema.String,
    providerId: Schema.NullOr(Ids.provider)
  },
  { httpApiStatus: 422 }
) {}
