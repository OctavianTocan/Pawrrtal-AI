/**
 * Centralized constants for the chat feature.
 *
 * Houses the canonical set of values, defaults, and `localStorage` keys used
 * across the chat surface (container, composer, controls). Co-locating them
 * here prevents key drift, makes it trivial to audit what we persist client
 * side, and gives one obvious place to look when adding or renaming a key.
 *
 * Conventions:
 * - `localStorage` keys are namespaced with `chat-composer:` so they don't
 *   collide with sidebar / nav / future feature keys in the same origin.
 * - `as const` tuples are used for enum-like sets so callers can both narrow
 *   types at compile time and validate persisted strings at runtime.
 */

import type { ChatModelId, ChatReasoningLevel } from './components/ModelSelectorPopover';

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
 * Identifiers for the tool permission modes exposed in the composer
 * toolbar.  Sent verbatim to the backend in the chat request body —
 * renaming a member is a wire-protocol break.  See
 * `backend/app/core/permissions/modes.py` for the matching enum.
 *
 * `as const` so the {@link PermissionMode} union and the runtime guard
 * derive from one source of truth.
 */
export const PERMISSION_MODES = [
	'plan',
	'ask-to-edit',
	'auto-review',
	'full-access',
	'custom',
] as const;

/** Available tool permission modes. */
export type PermissionMode = (typeof PERMISSION_MODES)[number];

/**
 * Default selection for new users — matches the backend's
 * `DEFAULT_PERMISSION_MODE`.  Picked so the agent never silently
 * mutates a workspace before the user opts in.
 */
export const DEFAULT_PERMISSION_MODE: PermissionMode = 'ask-to-edit';

/**
 * Order the modes appear in the dropdown.  Kept separate from the
 * metadata map so the visual order can change without altering the
 * declaration order of the union (which matters for type narrowing).
 */
export const PERMISSION_MODE_ORDER: ReadonlyArray<PermissionMode> = [
	'plan',
	'ask-to-edit',
	'auto-review',
	'full-access',
	'custom',
];

/** Modes that render below the in-menu separator (advanced / WIP). */
export const PERMISSION_MODE_ADVANCED: ReadonlySet<PermissionMode> = new Set(['custom']);

/**
 * Modes present in the type union but currently disabled in the UI —
 * the user can see them (greyed-out, with an explanation) but can't
 * select them.  When the underlying feature ships, remove the entry.
 *
 * `auto-review` — the LLM-judged-safety reviewer isn't built yet.
 *   Selecting it would (per the backend) treat as Full Access, which
 *   isn't the user's intent.  Tracked in beans.
 * `custom`      — `permissions.json` loader isn't implemented yet.
 */
export const PERMISSION_MODE_DISABLED: ReadonlySet<PermissionMode> = new Set([
	'auto-review',
	'custom',
]);

/**
 * Modes the Shift+Tab cycle visits.  Disabled modes are skipped so the
 * keyboard shortcut never lands on a non-functional mode.
 */
export const PERMISSION_MODE_CYCLE: ReadonlyArray<PermissionMode> = PERMISSION_MODE_ORDER.filter(
	(mode) => !PERMISSION_MODE_DISABLED.has(mode)
);

// ─── miscellaneous chat-container constants ────────────────────────────────

/** Maximum length for a sidebar-safe fallback conversation title. */
export const FALLBACK_TITLE_MAX_LENGTH = 80;
