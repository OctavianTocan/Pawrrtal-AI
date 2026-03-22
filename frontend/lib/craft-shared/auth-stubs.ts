export interface AuthState {
  isAuthenticated: boolean
  provider?: string
}
export interface SetupNeeds {
  needsApiKey: boolean
  needsWorkspace: boolean
  needsBillingConfig?: boolean
}
