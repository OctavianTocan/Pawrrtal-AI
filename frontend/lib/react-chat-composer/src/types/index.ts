/**
 * Public type surface for `@octavian-tocan/react-chat-composer`.
 *
 * Scaffold types — the matching runtime components will be vendored in stages
 * (see the host repo's `docs/plans/extract-react-chat-composer.md`). These
 * types are the contract every implementation step must honor.
 */

import type { ReactNode } from 'react';

/** Submitted message payload — text + the attachment list at submit time. */
export interface ChatComposerMessage {
	/** Trimmed text content from the textarea. */
	text: string;
	/** File attachments currently pinned to the composer. */
	attachments: File[];
}

/** Provider slug — known providers have bundled SVG logos; everything else falls back to a generic icon. */
export type ChatProviderSlug =
	| 'anthropic'
	| 'openai'
	| 'google'
	| 'mistral'
	| 'xai'
	| 'meta'
	| 'deepseek'
	| 'qwen'
	| (string & {});

/** A single model entry in the consumer-supplied list. */
export interface ChatModelOption {
	/** Stable model identifier surfaced via `onSelectModel`. */
	id: string;
	/** Short label shown in the composer trigger. */
	shortName: string;
	/** Full label shown in the dropdown row. */
	name: string;
	/** Provider slug used to look up the bundled logo. */
	provider: ChatProviderSlug;
	/** Tagline rendered as the secondary line in the dropdown row. */
	description: string;
	/** Optional per-model logo override — wins over the bundled provider logo. */
	logo?: ReactNode | string;
}

/** Reasoning-level identifier. Consumers supply the list; the package only displays. */
export type ChatReasoningLevel = string;

/** Empty-state suggestion row rendered below the composer when there's no draft. */
export interface ChatPromptSuggestion {
	/** Stable identifier — used as the React key and analytics token. */
	id: string;
	/** Suggested prompt text inserted into the composer when clicked. */
	label: string;
}

/**
 * Props for the flagship `<ChatComposer />`.
 *
 * Supports both controlled (`value` + `onChange`) and uncontrolled
 * (`defaultValue` + `onSubmit`) modes. Voice + model + reasoning props are all
 * optional — the corresponding UI affordances are hidden when their callbacks
 * are missing.
 */
export interface ChatComposerProps {
	// Text (both modes supported)
	/** Controlled text value. Pass with `onChange` for full control. */
	value?: string;
	/** Initial text value in uncontrolled mode. */
	defaultValue?: string;
	/** Fired on every keystroke in either mode. */
	onChange?: (text: string) => void;

	// Submit
	/** Fired when the user submits — Enter, click, or voice "send and transcribe". */
	onSubmit: (message: ChatComposerMessage) => void | Promise<void>;
	/** Streaming indicator — flips submit button into stop-streaming visual. */
	isLoading?: boolean;

	// Voice (mic button hidden if undefined)
	/**
	 * Called when the user finishes a voice recording. Receives the raw audio
	 * blob; returns the transcript string. If omitted, the mic button is hidden.
	 */
	onTranscribeAudio?: (audio: Blob, mimeType: string) => Promise<string>;

	// Model selector (button hidden if both undefined)
	/** Consumer-supplied model list. The picker is hidden when both this and `reasoningLevels` are omitted. */
	models?: ChatModelOption[];
	/** Currently selected model identifier. */
	selectedModelId?: string;
	/** Fired when the user picks a model from the dropdown. */
	onSelectModel?: (modelId: string) => void;
	/** Consumer-supplied reasoning-level list. */
	reasoningLevels?: ChatReasoningLevel[];
	/** Currently selected reasoning level. */
	selectedReasoning?: string;
	/** Fired when the user picks a reasoning level. */
	onSelectReasoning?: (level: ChatReasoningLevel) => void;

	// Slots
	/** Rendered between AttachButton and the right cluster — drop product-specific actions here. */
	footerActions?: ReactNode;

	// Presentation
	/** Extra classes merged onto the root composer column. */
	className?: string;
	/** Optional fixed placeholder; overrides the rotating empty-state tips. */
	placeholder?: string;
	/** Custom rotating empty-state placeholders. Falls back to a default tip set. */
	placeholders?: string[];

	// Accessibility
	/** ARIA label for the textarea. */
	ariaLabel?: string;
}
