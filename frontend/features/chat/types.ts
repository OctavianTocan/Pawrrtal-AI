/**
 * Discriminated SSE event shapes and rich message types for the chat feature.
 *
 * @fileoverview The backend `/api/v1/chat` endpoint emits five event kinds
 * over Server-Sent Events: `delta`, `thinking`, `tool_use`, `tool_result`,
 * and `error`. The transport (`useChat`) turns each frame into a
 * {@link ChatStreamEvent}; the container collapses the stream into a
 * {@link RichChatMessage} that the UI can render — reasoning panel above
 * the body, tool rows interleaved as needed.
 */

/** Plain text chunk from the assistant's main response. */
export interface ChatDeltaEvent {
	type: 'delta';
	content: string;
}

/** Reasoning / thinking chunk emitted before (or alongside) the answer. */
export interface ChatThinkingEvent {
	type: 'thinking';
	content: string;
}

/** Assistant invoking a tool. */
export interface ChatToolUseEvent {
	type: 'tool_use';
	tool_use_id: string;
	name: string;
	input: Record<string, unknown>;
}

/** Result returned for a previously emitted tool use. */
export interface ChatToolResultEvent {
	type: 'tool_result';
	tool_use_id: string;
	content: string;
}

/** Backend-surfaced stream-level error (provider failure, rate limit, etc.). */
export interface ChatErrorEvent {
	type: 'error';
	content: string;
}

/** Discriminated union of every event the backend chat stream can emit. */
export type ChatStreamEvent =
	| ChatDeltaEvent
	| ChatThinkingEvent
	| ChatToolUseEvent
	| ChatToolResultEvent
	| ChatErrorEvent;

/** Lifecycle of a single tool invocation as observed from the SSE stream. */
export type ChatToolCallStatus = 'pending' | 'completed';

/**
 * A tool invocation captured during streaming.
 *
 * Starts as `pending` when the assistant emits a `tool_use` event and flips
 * to `completed` once the matching `tool_result` arrives.
 */
export interface ChatToolCall {
	/** Stable id supplied by the backend (`tool_use.id`) — used to match results. */
	id: string;
	/** Tool name as declared by the assistant. */
	name: string;
	/** Input arguments the assistant passed to the tool. */
	input: Record<string, unknown>;
	/** Tool result text (only present once the tool has finished). */
	result?: string;
	/** Whether the result has arrived yet. */
	status: ChatToolCallStatus;
}
