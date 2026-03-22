/**
 * Electron IPC shim — no-op implementations for every window.electronAPI method
 * that Craft's renderer components call. This allows us to run Craft UI components
 * in a standard browser/Next.js environment without Electron.
 */

// biome-ignore lint/suspicious/noExplicitAny: shim must be maximally permissive
type AnyArgs = any[];
// biome-ignore lint/suspicious/noExplicitAny: shim must be maximally permissive
type AnyReturn = any;

const noopAsync = async (..._args: AnyArgs): Promise<void> => {};
const noopAsyncNull = async (..._args: AnyArgs): Promise<null> => null;
const noopAsyncEmpty = async (..._args: AnyArgs): Promise<AnyReturn[]> => [];
const noopAsyncFalse = async (..._args: AnyArgs): Promise<false> => false;
const noopAsyncEmptyString = async (..._args: AnyArgs): Promise<string> => "";
const noopAsyncEmptyObject = async (
	..._args: AnyArgs
): Promise<Record<string, never>> => ({});
const noopSubscribe =
	(..._args: AnyArgs): (() => void) =>
	() => {};
const noopSync = (..._args: AnyArgs): void => {};

/**
 * Complete electronAPI shim. Methods are grouped by domain.
 */
export const electronAPIShim = {
	// ── Session management ──────────────────────────────────────────────
	sessionCommand: noopAsync,
	getSessions: noopAsyncEmpty,
	onSessionEvent: noopSubscribe,
	cancelProcessing: noopAsync,
	respondToPermission: noopAsync,
	respondToCredential: noopAsync,
	createSession: noopAsyncNull,
	deleteSession: noopAsync,
	sendMessage: noopAsync,
	searchSessionContent: noopAsyncEmpty,
	getSessionMessages: noopAsyncEmpty,
	getSessionPermissionModeState: noopAsyncNull,
	setSessionModel: noopAsync,
	markAllSessionsRead: noopAsync,
	openSessionInNewWindow: noopAsync,
	showDeleteSessionConfirmation: noopAsyncFalse,

	// ── File operations ─────────────────────────────────────────────────
	readFile: noopAsyncEmptyString,
	readFileDataUrl: noopAsyncEmptyString,
	readFileBinary: noopAsyncNull,
	openFile: noopAsync,
	openFolderDialog: noopAsyncNull,
	readWorkspaceImage: noopAsyncNull,
	writeWorkspaceImage: noopAsync,
	showInFolder: noopAsync,
	getSessionFiles: noopAsyncEmpty,
	watchSessionFiles: noopAsync,
	onSessionFilesChanged: noopSubscribe,
	unwatchSessionFiles: noopAsync,
	storeAttachment: noopAsyncEmptyString,
	searchFiles: noopAsyncEmpty,
	listServerDirectory: noopAsyncEmpty,
	generateThumbnail: noopAsyncNull,

	// ── Workspace / window ──────────────────────────────────────────────
	getWorkspaces: noopAsyncEmpty,
	getWindowWorkspace: noopAsyncNull,
	setTrafficLightsVisible: noopSync,
	createWorkspace: noopAsyncNull,
	openWorkspace: noopAsync,
	switchWorkspace: noopAsync,
	checkWorkspaceSlug: noopAsyncFalse,
	getWorkspaceSettings: noopAsyncEmptyObject,
	updateWorkspaceSetting: noopAsync,
	getAllWorkspaceThemes: noopAsyncEmpty,
	onWorkspaceThemeChange: noopSubscribe,
	getWindowFocusState: noopAsyncFalse,
	onWindowFocusChange: noopSubscribe,

	// ── System / utility ────────────────────────────────────────────────
	getLatestReleaseVersion: noopAsyncNull,
	getHomeDir: noopAsyncEmptyString,
	onAutomationsChanged: noopSubscribe,
	testAutomation: noopAsync,
	getAutomationLastExecuted: noopAsyncNull,
	getAutomationHistory: noopAsyncEmpty,
	deleteAutomation: noopAsync,
	duplicateAutomation: noopAsync,
	setAutomationEnabled: noopAsync,
	replayAutomation: noopAsync,
	isDebugMode: noopAsyncFalse,
	debugLog: noopSync,
	checkForUpdates: noopAsync,
	installUpdate: noopAsync,
	dismissUpdate: noopAsync,
	getDismissedUpdateVersion: noopAsyncNull,
	getReleaseNotes: noopAsyncEmptyString,
	getUpdateInfo: noopAsyncNull,
	onUpdateAvailable: noopSubscribe,
	onUpdateDownloadProgress: noopSubscribe,

	// ── Preferences / settings ──────────────────────────────────────────
	readPreferences: noopAsyncEmptyObject,
	writePreferences: noopAsync,
	getAppTheme: noopAsyncNull,
	onAppThemeChange: noopSubscribe,
	getSystemTheme: noopAsyncNull,
	onSystemThemeChange: noopSubscribe,
	broadcastThemePreferences: noopAsync,
	onThemePreferencesChange: noopSubscribe,
	loadPresetThemes: noopAsyncEmpty,
	getSpellCheck: noopAsyncFalse,
	setSpellCheck: noopAsync,
	getAutoCapitalisation: noopAsyncFalse,
	setAutoCapitalisation: noopAsync,
	getSendMessageKey: noopAsyncNull,
	setSendMessageKey: noopAsync,
	getNotificationsEnabled: noopAsyncFalse,
	setNotificationsEnabled: noopAsync,
	getKeepAwakeWhileRunning: noopAsyncFalse,
	setKeepAwakeWhileRunning: noopAsync,
	getDefaultThinkingLevel: noopAsyncNull,
	setDefaultThinkingLevel: noopAsync,
	getNetworkProxySettings: noopAsyncNull,
	setNetworkProxySettings: noopAsync,

	// ── Permissions ─────────────────────────────────────────────────────
	getDefaultPermissionsConfig: noopAsyncNull,
	getWorkspacePermissionsConfig: noopAsyncNull,
	getSourcePermissionsConfig: noopAsyncNull,

	// ── LLM connections ─────────────────────────────────────────────────
	listLlmConnectionsWithStatus: noopAsyncEmpty,
	getLlmConnection: noopAsyncNull,
	getLlmConnectionApiKey: noopAsyncNull,
	saveLlmConnection: noopAsync,
	deleteLlmConnection: noopAsync,
	setDefaultLlmConnection: noopAsync,
	testLlmConnection: noopAsyncNull,
	testLlmConnectionSetup: noopAsyncNull,
	setupLlmConnection: noopAsyncNull,

	// ── OAuth ───────────────────────────────────────────────────────────
	performOAuth: noopAsyncNull,
	startClaudeOAuth: noopAsync,
	clearClaudeOAuthState: noopAsync,
	exchangeClaudeCode: noopAsyncNull,
	startCopilotOAuth: noopAsync,
	onCopilotDeviceCode: noopSubscribe,
	startChatGptOAuth: noopAsync,
	logout: noopAsync,

	// ── Sources ─────────────────────────────────────────────────────────
	getSources: noopAsyncEmpty,
	deleteSource: noopAsync,
	onSourcesChanged: noopSubscribe,

	// ── Skills ──────────────────────────────────────────────────────────
	getSkills: noopAsyncEmpty,
	deleteSkill: noopAsync,
	openSkillInFinder: noopAsync,
	onSkillsChanged: noopSubscribe,

	// ── Labels / statuses / views ───────────────────────────────────────
	listLabels: noopAsyncEmpty,
	deleteLabel: noopAsync,
	onLabelsChanged: noopSubscribe,
	listStatuses: noopAsyncEmpty,
	reorderStatuses: noopAsync,
	onStatusesChanged: noopSubscribe,
	listViews: noopAsyncEmpty,
	saveViews: noopAsync,

	// ── Drafts ──────────────────────────────────────────────────────────
	getAllDrafts: noopAsyncEmpty,
	setDraft: noopAsync,

	// ── MCP / tools ─────────────────────────────────────────────────────
	getMcpTools: noopAsyncEmpty,
	getToolIconMappings: noopAsyncEmptyObject,
	getCredentialHealth: noopAsyncEmptyObject,
	getPendingPlanExecution: noopAsyncNull,

	// ── Navigation / deep links ─────────────────────────────────────────
	openUrl: noopSync,
	onDeepLinkNavigate: noopSubscribe,
	onNotificationNavigate: noopSubscribe,

	// ── Menu / window chrome ────────────────────────────────────────────
	menuCopy: noopSync,
	menuCut: noopSync,
	menuPaste: noopSync,
	menuUndo: noopSync,
	menuRedo: noopSync,
	menuSelectAll: noopSync,
	menuZoomIn: noopSync,
	menuZoomOut: noopSync,
	menuZoomReset: noopSync,
	menuMinimize: noopSync,
	menuMaximize: noopSync,
	menuNewWindow: noopSync,
	menuToggleDevTools: noopSync,
	menuQuit: noopSync,
	onMenuKeyboardShortcuts: noopSubscribe,
	onMenuNewChat: noopSubscribe,
	onMenuOpenSettings: noopSubscribe,
	onMenuToggleFocusMode: noopSubscribe,
	onMenuToggleSidebar: noopSubscribe,
	onCloseRequested: noopSubscribe,
	cancelCloseWindow: noopSync,
	confirmCloseWindow: noopSync,

	// ── Notifications / badges ──────────────────────────────────────────
	showNotification: noopAsync,
	refreshBadge: noopAsync,
	setDockIconWithBadge: noopAsync,
	onBadgeDraw: noopSubscribe,
	onBadgeDrawWindows: noopSubscribe,
	getUnreadSummary: noopAsyncNull,
	onUnreadSummaryChanged: noopSubscribe,

	// ── Transport ───────────────────────────────────────────────────────
	getTransportConnectionState: noopAsyncNull,
	onTransportConnectionStateChanged: noopSubscribe,
	reconnectTransport: noopAsync,
	onReconnected: noopSubscribe,

	// ── PI provider ─────────────────────────────────────────────────────
	getPiProviderBaseUrl: noopAsyncNull,
	getPiProviderModels: noopAsyncEmpty,
	isChannelAvailable: noopAsyncFalse,
	getLogoUrl: noopAsyncNull,

	// ── Setup ───────────────────────────────────────────────────────────
	deferSetup: noopAsync,
	getSetupNeeds: noopAsyncNull,
	browseForGitBash: noopAsyncNull,
	checkGitBash: noopAsyncFalse,
	setGitBashPath: noopAsync,
	getTaskOutput: noopAsyncNull,
	killShell: noopAsync,
} as const;

/**
 * Install the shim on `window.electronAPI` if we're in a browser
 * and there is no real Electron bridge present.
 */
export function installElectronShim(): void {
	if (typeof window === "undefined") return;
	if (window.electronAPI) return;

	// biome-ignore lint/suspicious/noExplicitAny: global augmentation for shim
	(window as any).electronAPI = electronAPIShim;
}

// Auto-install on module load (safe for SSR — guarded by typeof window check)
installElectronShim();

// Global type augmentation so TypeScript knows about window.electronAPI
declare global {
	interface Window {
		electronAPI?: typeof electronAPIShim;
	}
}
