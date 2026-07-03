/** Shared branded identifiers for Pawrrtal domain contracts. */

import { Schema } from 'effect';

const Uuid: Schema.Codec<string> = Schema.String.check(Schema.isUUID(4));

const BrandedText = (brand: string, identifier: string, description: string): Schema.Codec<string> =>
  Schema.String.pipe(Schema.brand(brand)).annotate({ identifier, description });

/** Shared ID schemas used by HTTP, RPC, harness, app services, and CLI clients. */
export const Ids = {
  user: Uuid.annotate({
    identifier: 'UserId',
    description: 'Stable Pawrrtal user or profile owner id.'
  }),
  workspace: Uuid.annotate({
    identifier: 'WorkspaceId',
    description: 'Stable Pawrrtal workspace id.'
  }),
  session: Uuid.annotate({
    identifier: 'SessionId',
    description: 'Stable Pawrrtal session id.'
  }),
  agentTurn: Uuid.annotate({
    identifier: 'AgentTurnId',
    description: 'Stable provider-backed turn id.'
  }),
  message: Uuid.annotate({
    identifier: 'MessageId',
    description: 'Stable source message id.'
  }),
  event: Uuid.annotate({
    identifier: 'AgentProviderEventId',
    description: 'Stable normalized provider event id.'
  }),
  providerSession: Uuid.annotate({
    identifier: 'ProviderSessionId',
    description: 'Stable provider-scoped continuation record id.'
  }),
  provider: BrandedText('ProviderId', 'ProviderId', 'Stable provider id such as deterministic or claude-agent-sdk.'),
  capability: BrandedText('CapabilityId', 'CapabilityId', 'Stable host-owned capability id.'),
  capabilityBoundary: BrandedText(
    'CapabilityBoundaryId',
    'CapabilityBoundaryId',
    'Stable host-owned capability boundary id.'
  ),
  conformanceRun: Uuid.annotate({
    identifier: 'ProviderConformanceRunId',
    description: 'Stable provider conformance run id.'
  }),
  scenario: BrandedText('ProviderConformanceScenarioId', 'ProviderConformanceScenarioId', 'Provider scenario id.'),
  routeRef: BrandedText('SessionRouteRef', 'SessionRouteRef', 'Optional channel or caller route reference.')
} as const;

export type UserId = Schema.Schema.Type<typeof Ids.user>;
export type WorkspaceId = Schema.Schema.Type<typeof Ids.workspace>;
export type SessionId = Schema.Schema.Type<typeof Ids.session>;
export type AgentTurnId = Schema.Schema.Type<typeof Ids.agentTurn>;
export type MessageId = Schema.Schema.Type<typeof Ids.message>;
export type AgentProviderEventId = Schema.Schema.Type<typeof Ids.event>;
export type ProviderSessionId = Schema.Schema.Type<typeof Ids.providerSession>;
export type ProviderId = Schema.Schema.Type<typeof Ids.provider>;
export type CapabilityId = Schema.Schema.Type<typeof Ids.capability>;
export type CapabilityBoundaryId = Schema.Schema.Type<typeof Ids.capabilityBoundary>;
export type ProviderConformanceRunId = Schema.Schema.Type<typeof Ids.conformanceRun>;
export type ProviderConformanceScenarioId = Schema.Schema.Type<typeof Ids.scenario>;
export type SessionRouteRef = Schema.Schema.Type<typeof Ids.routeRef>;
