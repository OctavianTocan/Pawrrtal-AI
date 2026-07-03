/** App-owned provider registry composition for HTTP runtime services. */

import { AgentProviderRegistryLive, AgentProviderServiceBody } from '@pawrrtal/harness';
import { Layer } from 'effect';

/** Live harness provider service selected for the API app runtime. */
export const AppAgentProviderServiceLive = Layer.provide(AgentProviderServiceBody, [AgentProviderRegistryLive]);
