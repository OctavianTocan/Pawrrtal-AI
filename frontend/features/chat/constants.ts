/**
 * Centralized constants for the chat feature.
 *
 * Houses the canonical set of values, defaults, and `localStorage` keys used
 * across the chat surface (container, composer wiring, host-local
 * footerActions). Co-locating them here prevents key drift, makes it trivial
 * to audit what we persist client side, and gives one obvious place to look
 * when adding or renaming a key.
 *
 * Conventions:
 * - `localStorage` keys are namespaced with `chat-composer:` so they don't
 *   collide with sidebar / nav / future feature keys in the same origin.
 * - `as const` tuples are used for enum-like sets so callers can both narrow
 *   types at compile time and validate persisted strings at runtime.
 */

import type { ChatModelOption } from '@octavian-tocan/react-chat-composer';

// ─── pawrrtal model catalogue ──────────────────────────────────────────────

/**
 * Canonical pawrrtal model list passed to the package's `<ChatComposer />`.
 *
 * Declared as an `as const` tuple so the {@link ChatModelId} union below can
 * be derived from the same literal IDs the picker renders — the host keeps
 * a narrow runtime-validated union locally even though the package's prop
 * accepts the wider `string`.
 */
export const PAWRRTAL_MODELS = [
	{
		id: 'claude-opus-4-7',
		shortName: 'Claude Opus 4.7',
		name: 'Claude Opus 4.7',
		provider: 'anthropic',
		description: 'Most capable for ambitious work',
	},
	{
		id: 'claude-sonnet-4-6',
		shortName: 'Claude Sonnet 4.6',
		name: 'Claude Sonnet 4.6',
		provider: 'anthropic',
		description: 'Balanced for everyday tasks',
	},
	{
		id: 'claude-haiku-4-5',
		shortName: 'Claude Haiku 4.5',
		name: 'Claude Haiku 4.5',
		provider: 'anthropic',
		description: 'Fastest for quick answers',
	},
	{
		id: 'gpt-5.5',
		shortName: 'GPT-5.5',
		name: 'GPT-5.5',
		provider: 'openai',
		description: "OpenAI's flagship reasoning",
	},
	{
		id: 'gpt-5.4',
		shortName: 'GPT-5.4',
		name: 'GPT-5.4',
		provider: 'openai',
		description: 'Faster GPT for everyday tasks',
	},
	{
		id: 'gemini-3-flash-preview',
		shortName: 'Gemini 3 Flash',
		name: 'Gemini 3 Flash Preview',
		provider: 'google',
		description: "Google's frontier multimodal",
	},
	{
		id: 'gemini-3.1-flash-lite-preview',
		shortName: 'Gemini Flash Lite',
		name: 'Gemini 3.1 Flash Lite Preview',
		provider: 'google',
		description: 'Light and fast Gemini',
	},
] as const satisfies ReadonlyArray<ChatModelOption>;

/** Narrow union of every pawrrtal-supported model id. */
export type ChatModelId = (typeof PAWRRTAL_MODELS)[number]['id'];

/** Runtime allowlist used by the persisted-state validator in the container. */
export const CHAT_MODEL_IDS: ReadonlyArray<ChatModelId> = PAWRRTAL_MODELS.map((model) => model.id);

/** Reasoning levels exposed in the picker. */
export const CHAT_REASONING_LEVELS = ['low', 'medium', 'high', 'extra-high'] as const;

/** Narrow union of every reasoning level. */
export type ChatReasoningLevel = (typeof CHAT_REASONING_LEVELS)[number];

// ─── localStorage keys ─────────────────────────────────────────────────────

/**
 * Single source of truth for every `localStorage` key the chat feature owns.
 *
 * Use this object rather than inline string literals so renames stay safe and
 * the full set of persisted keys is visible at a glance.
 */
export const CHAT_STORAGE_KEYS = {
	/** User's most recently selected chat model. */
	selectedModelId: 'chat-composer:selected-model-id',
	/** User's most recently selected reasoning level. */
	selectedReasoning: 'chat-composer:selected-reasoning-level',
	/** Whether the Plan-mode toggle is currently visible in the toolbar. */
	planModeVisible: 'chat-composer:plan-mode-visible',
	/** Active safety / auto-review permission mode. */
	safetyMode: 'chat-composer:safety-mode',
} as const;

/** Union of every recognized chat `localStorage` key. */
export type ChatStorageKey = (typeof CHAT_STORAGE_KEYS)[keyof typeof CHAT_STORAGE_KEYS];

// ─── defaults ──────────────────────────────────────────────────────────────

/** Default model used when nothing is persisted yet. */
export const DEFAULT_CHAT_MODEL_ID: ChatModelId = 'gemini-3-flash-preview';

/** Default reasoning level used when nothing is persisted yet. */
export const DEFAULT_REASONING_LEVEL: ChatReasoningLevel = 'medium';

/**
 * Default Plan-mode visibility for a fresh chat session. Off by default so a
 * brand-new conversation doesn't start in Plan mode — the user opts in via
 * Shift+Tab and the choice is then persisted.
 */
export const DEFAULT_PLAN_MODE_VISIBLE = false;

// ─── safety-mode enum ──────────────────────────────────────────────────────

/**
 * Identifiers for the safety / auto-review permissions exposed in the
 * composer toolbar. `as const` so the {@link SafetyMode} union and the
 * runtime guard are derived from one source of truth.
 */
export const SAFETY_MODES = [
	'default-permissions',
	'auto-review',
	'full-access',
	'custom',
] as const;

/** Available safety / auto-review permission modes. */
export type SafetyMode = (typeof SAFETY_MODES)[number];

/** Default selection — matches the previously hardcoded "Auto-review" entry. */
export const DEFAULT_SAFETY_MODE: SafetyMode = 'auto-review';

// ─── miscellaneous chat-container constants ────────────────────────────────

/** Maximum length for a sidebar-safe fallback conversation title. */
export const FALLBACK_TITLE_MAX_LENGTH = 80;
