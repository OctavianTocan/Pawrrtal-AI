/**
 * Pure helpers that fold a single SSE event into the in-flight assistant message.
 *
 * @fileoverview Lifted out of `ChatContainer.tsx` so the reducer can be unit
 * tested without rendering a component, and so the container body stays focused
 * on lifecycle/routing wiring instead of state-shape mechanics.
 */

import type { ChatHistoryMessage } from '@/lib/types';
import type { ChatStreamEvent, ChatToolCall } from './types';

/**
 * Apply an updater to the last assistant message in `messages`, returning a
 * new array. Each SSE event produces exactly one immutable message-list update
 * via this helper so React can short-circuit unrelated rows.
 */
export function updateLastAssistantMessage(
	messages: Array<ChatHistoryMessage>,
	update: (current: ChatHistoryMessage) => ChatHistoryMessage
): Array<ChatHistoryMessage> {
	const lastIndex = messages.length - 1;
	const last = messages[lastIndex];
	if (!last || last.role !== 'assistant') return messages;

	const updated = [...messages];
	updated[lastIndex] = update(last);
	return updated;
}

/**
 * Stamp `thinking_started_at` the first time we see a delta/thinking/tool
 * event. The reducer uses the wall clock so the UI can show a live "thinking
 * for Xs" affordance even across separate SSE bursts.
 */
function markStartedAt(message: ChatHistoryMessage): ChatHistoryMessage {
	if (message.thinking_started_at !== undefined) return message;
	return { ...message, thinking_started_at: Date.now() };
}

/**
 * Append a `thinking` slot to the timeline, merging into a trailing one.
 *
 * Consecutive `thinking` chunks all belong to the same logical reasoning
 * burst, so we coalesce them rather than creating a new bullet for every
 * SSE frame. A tool invocation inserted between two thinking bursts breaks
 * the merge: the trailing thinking is no longer the last entry.
 */
function pushThinkingTimelineEntry(message: ChatHistoryMessage, text: string): ChatHistoryMessage {
	const timeline = message.timeline ?? [];
	const last = timeline[timeline.length - 1];
	if (last?.kind === 'thinking') {
		const merged: ChatHistoryMessage['timeline'] = [
			...timeline.slice(0, -1),
			{ kind: 'thinking', text: last.text + text },
		];
		return { ...message, timeline: merged };
	}
	return { ...message, timeline: [...timeline, { kind: 'thinking', text }] };
}

/**
 * Reduce a single {@link ChatStreamEvent} into the in-flight assistant message.
 *
 * Pure function so it stays trivially testable and composes inside a setState
 * updater. `error` events never reach here — the transport throws on those and
 * the catch block in `runAssistantTurn` writes the error into `content`.
 */
export function applyChatEvent(
	message: ChatHistoryMessage,
	event: ChatStreamEvent
): ChatHistoryMessage {
	switch (event.type) {
		case 'delta':
			return markStartedAt({
				...message,
				content: message.content + event.content,
				assistant_status: 'streaming',
			});
		case 'thinking': {
			const stamped = markStartedAt(message);
			const withText: ChatHistoryMessage = {
				...stamped,
				thinking: (stamped.thinking ?? '') + event.content,
				assistant_status: 'streaming',
			};
			return pushThinkingTimelineEntry(withText, event.content);
		}
		case 'tool_use': {
			const stamped = markStartedAt(message);
			const newCall: ChatToolCall = {
				id: event.tool_use_id,
				name: event.name,
				input: event.input,
				status: 'pending',
			};
			return {
				...stamped,
				assistant_status: 'streaming',
				tool_calls: [...(stamped.tool_calls ?? []), newCall],
				timeline: [
					...(stamped.timeline ?? []),
					{ kind: 'tool', toolCallId: event.tool_use_id },
				],
			};
		}
		case 'tool_result': {
			const calls = message.tool_calls ?? [];
			const updated = calls.map((call) =>
				call.id === event.tool_use_id
					? { ...call, result: event.content, status: 'completed' as const }
					: call
			);
			return { ...message, tool_calls: updated };
		}
		case 'error':
			// Should be unreachable — the transport surfaces errors by throwing.
			return { ...message, content: `Error: ${event.content}`, assistant_status: 'failed' };
		default:
			return message;
	}
}

/**
 * Compute the elapsed reasoning duration in whole seconds from the first
 * thinking/tool/delta to the call completion. Returns 0 when no events ever
 * arrived (e.g. the stream errored before producing anything).
 */
export function computeThinkingDuration(message: ChatHistoryMessage): number {
	if (message.thinking_started_at === undefined) return 0;
	const elapsedMs = Date.now() - message.thinking_started_at;
	return Math.max(0, Math.round(elapsedMs / 1000));
}
