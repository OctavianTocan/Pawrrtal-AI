/** Effect Schema tagged errors raised by provider adapters and the harness runtime. */

import { Ids } from '@pawrrtal/domain-core';
import { Schema } from 'effect';

const ProviderErrorFields = {
  /** Safe provider error detail. */
  detail: Schema.String,
  /** Provider involved in the failure, when already resolved. */
  providerId: Schema.NullOr(Ids.provider),
  /** Safe next action for operators or callers. */
  safeNextAction: Schema.NullOr(Schema.String)
} as const;

/** Provider setup cannot be decoded or satisfied. */
export class ProviderSetupError extends Schema.TaggedErrorClass<ProviderSetupError>()(
  'ProviderSetupError',
  ProviderErrorFields
) {}

/** Provider could not accept a turn. */
export class ProviderStartError extends Schema.TaggedErrorClass<ProviderStartError>()(
  'ProviderStartError',
  ProviderErrorFields
) {}

/** Provider could not accept follow-up input. */
export class ProviderInputError extends Schema.TaggedErrorClass<ProviderInputError>()(
  'ProviderInputError',
  ProviderErrorFields
) {}

/** Provider stream failed after accepting a turn. */
export class ProviderStreamError extends Schema.TaggedErrorClass<ProviderStreamError>()(
  'ProviderStreamError',
  ProviderErrorFields
) {}

/** Provider cancellation failed or is unsupported. */
export class ProviderCancellationError extends Schema.TaggedErrorClass<ProviderCancellationError>()(
  'ProviderCancellationError',
  ProviderErrorFields
) {}

/** Provider continuation could not be reused or rotated. */
export class ProviderContinuationError extends Schema.TaggedErrorClass<ProviderContinuationError>()(
  'ProviderContinuationError',
  ProviderErrorFields
) {}

/** Provider capability was denied or unsupported. */
export class ProviderCapabilityError extends Schema.TaggedErrorClass<ProviderCapabilityError>()(
  'ProviderCapabilityError',
  ProviderErrorFields
) {}

/** Provider contract validation failed. */
export class ProviderContractHarnessError extends Schema.TaggedErrorClass<ProviderContractHarnessError>()(
  'ProviderContractHarnessError',
  ProviderErrorFields
) {}

/** Provider rate limit was decoded at the adapter boundary. */
export class ProviderRateLimitError extends Schema.TaggedErrorClass<ProviderRateLimitError>()(
  'ProviderRateLimitError',
  ProviderErrorFields
) {}

/** Provider auth failed at the adapter boundary. */
export class ProviderAuthError extends Schema.TaggedErrorClass<ProviderAuthError>()(
  'ProviderAuthError',
  ProviderErrorFields
) {}

export type ProviderFailure =
  | ProviderSetupError
  | ProviderStartError
  | ProviderInputError
  | ProviderStreamError
  | ProviderCancellationError
  | ProviderContinuationError
  | ProviderCapabilityError
  | ProviderContractHarnessError
  | ProviderRateLimitError
  | ProviderAuthError;
