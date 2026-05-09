/**
 * Discriminated SSE event shapes and rich message types for the chat feature.
 *
 * @fileoverview The backend `/api/v1/chat` endpoint emits five event kinds
 * over Server-Sent Events: `delta`, `thinking`, `tool_use`, `tool_result`,
 * and `error`. The transport (`useChat`) turns each frame into a
 * {@link ChatStreamEvent}; the container collapses the stream into a
 * {@link import('@/lib/types').AgnoMessage} that the UI can render —
 * reasoning panel above the body, chronologically-ordered tool rows, source
 * chips, and a reply-action toolbar.
 */

import type { CalendarEventInfo, MemoryResultInfo, WebSourceInfo } from './tool-result-parsers';

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

/**
 * Emitted when the agent safety layer terminates the loop early.
 *
 * Distinct from `error` — this is a controlled stop (hit an iteration cap,
 * wall-clock budget, or consecutive-error threshold) rather than an
 * unexpected failure. The `content` field carries a human-readable
 * explanation of why the agent stopped.
 */
export interface ChatAgentTerminatedEvent {
	type: 'agent_terminated';
	content: string;
}

/** Discriminated union of every event the backend chat stream can emit. */
export type ChatStreamEvent =
	| ChatDeltaEvent
	| ChatThinkingEvent
	| ChatToolUseEvent
	| ChatToolResultEvent
	| ChatErrorEvent
	| ChatAgentTerminatedEvent;

/** Lifecycle of a single tool invocation as observed from the SSE stream. */
export type ChatToolCallStatus = 'pending' | 'completed' | 'failed';

/**
 * A tool invocation captured during streaming.
 *
 * Starts as `pending` when the assistant emits a `tool_use` event and flips
 * to `completed` once the matching `tool_result` arrives. Carries pre-parsed
 * source chips so the renderer doesn't reparse on every frame.
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
	/** Web result chips parsed from `result` for `web_search`. */
	webSources?: WebSourceInfo[];
	/** Calendar event chips parsed from `result` for `calendar_search`. */
	calendarEvents?: CalendarEventInfo[];
	/** Memory chips parsed from `result` for memory-flavoured tools. */
	memoryResults?: MemoryResultInfo[];
}

/**
 * One slot in the chain-of-thought timeline.
 *
 * The container records every thinking burst and tool invocation in arrival
 * order so the chain-of-thought view can render them chronologically instead
 * of bucketing all thinking text above all tool steps.
 */
export type ChatTimelineEntry =
	| { kind: 'thinking'; text: string }
	| { kind: 'tool'; toolCallId: string };

/**
 * Whether an assistant message is currently failed (so the UI can offer a
 * retry button) — separate from `status` on individual tool calls.
 */
export type AssistantMessageStatus = 'streaming' | 'complete' | 'failed';
