export interface CredentialHealthStatus {
  healthy: boolean
  issues: CredentialHealthIssue[]
}
export interface CredentialHealthIssue {
  type: CredentialHealthIssueType
  message: string
}
export type CredentialHealthIssueType = 'missing' | 'expired' | 'invalid' | 'file_corrupted' | 'decryption_failed' | 'no_default_credentials'
export type CredentialHealthRecord = Record<string, CredentialHealthStatus>
