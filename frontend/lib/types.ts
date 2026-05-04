/**
 * Shared TypeScript type definitions for conversations, messages, and sidebar items.
 *
 * @fileoverview Types consumed by both the sidebar and the chat view.
 */

/** The role of a message sender: human user, AI assistant, or a plan artifact. */
export type MessageRole = 'user' | 'assistant' | 'plan';

/** Structured label attached to a conversation (e.g. status tags, categories). */
export type ConversationLabel = {
	/** Machine-readable slug derived from the label name. */
	id?: string;
	/** Human-readable label text. */
	name: string;
	/** Optional hex color for badge rendering. */
	color?: string;
	/** Optional string value associated with the label. */
	value?: string;
	/**
	 * Semantic type hint for the value.
	 * The value itself is always stored as a string regardless of this hint.
	 */
	valueType?: 'string' | 'number' | 'date';
};

/**
 * A label that is either a structured object or a legacy plain string.
 * TODO: Remove the plain-string branch once label migration is complete.
 */
export type ConversationLabelLike = ConversationLabel | string;

/** Status values a conversation can be tagged with. */
export type ConversationStatus = 'todo' | 'in_progress' | 'done' | null;

/** A single conversation record as returned by the backend API. */
export interface Conversation {
	/** Unique conversation identifier. */
	id: string;
	/** ID of the user who owns the conversation. */
	user_id: string;
	/** Display title of the conversation. */
	title: string;
	/** ISO timestamp of creation. */
	created_at: string;
	/** ISO timestamp of last update. */
	updated_at: string;
	/** Whether the conversation has been archived and hidden from the main list. */
	is_archived: boolean;
	/** Whether the conversation has been flagged for follow-up. */
	is_flagged: boolean;
	/** Whether the conversation has an unread indicator. */
	is_unread: boolean;
	/** Workflow status tag: 'todo', 'in_progress', 'done', or null. */
	status: ConversationStatus;
	// Optional sidebar metadata ported from Craft-style session rows.
	/** Whether the conversation is currently generating a response. */
	is_processing?: boolean;
	/** Whether the sidebar should show an unread indicator. */
	has_unread_meta?: boolean;
	/** Role of the most recent message in the conversation. */
	last_message_role?: MessageRole | null;
	/** Number of queued prompts awaiting processing. */
	pending_prompt_count?: number;
	/** Tags or categories assigned to the conversation. */
	labels?: ConversationLabelLike[];
}

/**
 * Message shape used by the Agno agent / chat API.
 *
 * The streaming-only fields below (`thinking`, `tool_calls`, `timeline`,
 * `thinking_started_at`, `thinking_duration_seconds`, `assistant_status`) are
 * optional so that history fetched from the server (which only persists
 * `role` + `content`) hydrates unchanged; they're populated live during
 * streaming by {@link import('@/features/chat/ChatContainer').default}.
 */
export interface AgnoMessage {
	/** Sender of the message. Excludes `'plan'` from {@link MessageRole}. */
	role: Exclude<MessageRole, 'plan'>;
	/** Plain-text message body. */
	content: string;
	/** Accumulated reasoning text from `thinking` SSE events on the assistant turn. */
	thinking?: string;
	/** Tool invocations and their results captured during streaming. */
	tool_calls?: import('@/features/chat/types').ChatToolCall[];
	/** Arrival-ordered timeline of thinking bursts and tool invocations. */
	timeline?: import('@/features/chat/types').ChatTimelineEntry[];
	/** Wall-clock millis when the first thinking/tool/delta event landed. */
	thinking_started_at?: number;
	/** Total reasoning duration in whole seconds — set when streaming completes. */
	thinking_duration_seconds?: number;
	/** Lifecycle of the assistant turn — drives the failed-state UI. */
	assistant_status?: import('@/features/chat/types').AssistantMessageStatus;
}
