/** Provider runtime contract shared by deterministic, Claude SDK, and future adapters. */

import type { ProviderId } from '@pawrrtal/domain-core';
import type { AgentProviderRead } from '@pawrrtal/domain-core/Modules/AgentProviders/Domain';
import type { AgentProviderEventRead } from '@pawrrtal/domain-core/Modules/AgentTurns/Domain';
import type { Effect, Stream } from 'effect';
import type {
  ProviderCancellationError,
  ProviderContinuationError,
  ProviderFailure,
  ProviderInputError,
  ProviderSetupError,
  ProviderStartError,
  ProviderStreamError
} from './Errors';
import type {
  ContinuationRotationDecision,
  ContinuationRotationInput,
  ProviderCancellationReason,
  ProviderFollowUpInput,
  ProviderQueryInput
} from './InternalDomain';

/** Active provider query returned after a provider accepts one turn. */
export interface AgentQuery {
  /** Sends follow-up input to the active query when the provider supports it. */
  readonly push: (input: ProviderFollowUpInput) => Effect.Effect<void, ProviderInputError>;

  /** Closes user input for the active query. */
  readonly endInput: Effect.Effect<void, ProviderInputError>;

  /** Normalized events produced by the provider. */
  readonly events: Stream.Stream<AgentProviderEventRead, ProviderStreamError>;

  /** Requests cancellation for the active query. */
  readonly abort: (reason: ProviderCancellationReason) => Effect.Effect<void, ProviderCancellationError>;
}

/** Selectable provider adapter owned by the harness package. */
export interface AgentProvider {
  /** Stable provider id. */
  readonly providerId: ProviderId;

  /** Decoded public provider definition. */
  readonly describe: Effect.Effect<AgentProviderRead, ProviderSetupError>;

  /** Starts one provider-backed turn. */
  readonly query: (input: ProviderQueryInput) => Effect.Effect<AgentQuery, ProviderStartError>;

  /** Maps provider failures that invalidate native continuation state. */
  readonly isSessionInvalid: (failure: ProviderFailure) => boolean;

  /** Decides whether a provider continuation can be reused. */
  readonly maybeRotateContinuation: (
    input: ContinuationRotationInput
  ) => Effect.Effect<ContinuationRotationDecision, ProviderContinuationError>;
}
