export interface PermissionsConfigFile {
  version?: string
  allowedBashPatterns?: (string | { pattern: string; comment?: string })[]
  allowedMcpPatterns?: (string | { pattern: string; comment?: string })[]
  allowedApiEndpoints?: { method: string; path: string; comment?: string }[]
  allowedWritePaths?: (string | { pattern: string; comment?: string })[]
  blockedTools?: (string | { pattern: string; comment?: string })[]
  rules?: Record<string, unknown>
}
