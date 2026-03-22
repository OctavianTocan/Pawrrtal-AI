/**
 * Stub types for @craft-agent/core
 * These are the minimal types needed by the renderer.
 */

export interface ContentBadge {
  type: string
  label: string
  value?: string
  icon?: string
}

export type AuthRequestType = 'permission' | 'credential' | 'admin_approval' | 'oauth' | 'oauth-google' | 'oauth-slack' | 'oauth-microsoft'
export type AuthStatus = 'pending' | 'approved' | 'denied' | 'expired'
