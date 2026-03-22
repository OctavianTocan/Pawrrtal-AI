/**
 * WebAppShellContext — provides a default AppShellContextType for web mode.
 *
 * In Electron, App.tsx builds a full contextValue with real IPC callbacks.
 * In our Next.js web app, we provide no-op/stub callbacks since we handle
 * session management through our own API layer (features/chat/).
 */

import type { AppShellContextType } from "./AppShellContext"

const noop = () => {}
const noopAsync = async () => {}
const noopAsyncSession = async () => ({} as any)
const noopAsyncBool = async () => false

export function createWebContextValue(
  overrides?: Partial<AppShellContextType>,
): AppShellContextType {
  return {
    // Data defaults
    workspaces: [],
    activeWorkspaceId: null,
    activeWorkspaceSlug: null,
    llmConnections: [],
    refreshLlmConnections: noopAsync,
    pendingPermissions: new Map(),
    pendingCredentials: new Map(),
    getDraft: () => "",
    sessionOptions: new Map(),

    // Session callbacks (no-ops — our web app handles via features/chat/)
    onCreateSession: noopAsyncSession,
    onSendMessage: noop,
    onRenameSession: noop,
    onFlagSession: noop,
    onUnflagSession: noop,
    onArchiveSession: noop,
    onUnarchiveSession: noop,
    onMarkSessionRead: noop,
    onMarkSessionUnread: noop,
    onSetActiveViewingSession: noop,
    onSessionStatusChange: noop,
    onDeleteSession: noopAsyncBool,

    // File/URL handlers
    onOpenFile: noop,
    onOpenUrl: (url: string) => {
      window.open(url, "_blank")
    },

    // Workspace
    onSelectWorkspace: noop,

    // App actions
    onOpenSettings: noop,
    onOpenKeyboardShortcuts: noop,
    onOpenStoredUserPreferences: noop,
    onReset: noop,

    // Unified session options
    onSessionOptionsChange: noop,

    // Input draft
    onInputChange: noop,

    // Apply overrides
    ...overrides,
  }
}
