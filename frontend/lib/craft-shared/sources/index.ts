/**
 * Sources Module
 *
 * Public exports for source management.
 */

// Types
export type {
  SourceType,
  SourceMcpAuthType,
  ApiAuthType,
  KnownProvider,
  ApiOAuthProvider,
  McpSourceConfig,
  ApiSourceConfig,
  LocalSourceConfig,
  SourceConnectionStatus,
  FolderSourceConfig,
  SourceGuide,
  LoadedSource,
  CreateSourceInput,
} from './types';

// Constants and helpers
export {
  API_OAUTH_PROVIDERS,
  isApiOAuthProvider,
} from './types';

// Storage functions
export {
  // Directory utilities
  ensureSourcesDir,
  getSourcePath,
  // Config operations
  loadSourceConfig,
  saveSourceConfig,
  markSourceAuthenticated,
  // Guide operations
  loadSourceGuide,
  saveSourceGuide,
  // Icon operations
  findSourceIcon,
  downloadSourceIcon,
  sourceNeedsIconDownload,
  isIconUrl,
  // Load operations
  loadSource,
  loadWorkspaceSources,
  loadAllSources,
  getEnabledSources,
  isSourceUsable,
  getSourcesBySlugs,
  // Create/Delete operations
  generateSourceSlug,
  createSource,
  deleteSource,
  sourceExists,
  // Parsing utilities
  parseGuideMarkdown,
} from './storage';

// Credential Manager (unified credential operations)
export {
  SourceCredentialManager,
  getSourceCredentialManager,
  getSourcesNeedingAuth,
} from './credential-manager';
export type {
  AuthResult,
  ApiCredential,
  BasicAuthCredential,
} from './credential-manager';

// Server Builder (builds MCP/API servers from sources)
export {
  SourceServerBuilder,
  getSourceServerBuilder,
  normalizeMcpUrl,
  SERVER_BUILD_ERRORS,
} from './server-builder';
export type {
  McpServerConfig,
  SourceWithCredential,
  BuiltServers,
} from './server-builder';

// Built-in Sources (always available in every workspace)
export {
  getDocsSource,
  getBuiltinSources,
  isBuiltinSource,
} from './builtin-sources';

// API Tools (types)
export type { SummarizeCallback } from './api-tools';

// Token Refresh Manager (handles OAuth token refresh with rate limiting)
export {
  TokenRefreshManager,
  createTokenGetter,
} from './token-refresh-manager';
export type {
  TokenRefreshResult,
  RefreshManagerOptions,
} from './token-refresh-manager';
