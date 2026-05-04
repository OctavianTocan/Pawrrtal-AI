'use client';

import type { ToolUIPart } from 'ai';
import type * as React from 'react';
import { Loader } from '@/components/ai-elements/loader';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning';
import {
	Tool,
	ToolContent,
	ToolHeader,
	ToolInput,
	ToolOutput,
} from '@/components/ai-elements/tool';
import type { ChatToolCall } from '../types';

/**
 * Map a {@link ChatToolCall} status to the {@link ToolUIPart} state expected by
 * the AI Elements `<Tool>` component.
 */
function toolStateFor(call: ChatToolCall): ToolUIPart['state'] {
	if (call.status === 'completed') {
		// Errors are surfaced as a stream-level error event today, so any completed
		// call is treated as success here. Differentiating success vs error would
		// require the backend to flag tool_result frames.
		return 'output-available';
	}
	return 'input-available';
}

/**
 * Props for {@link AssistantMessage}.
 */
interface AssistantMessageProps {
	/** Plain-text response body (markdown rendered via Streamdown). */
	content: string;
	/** Reasoning text accumulated from `thinking` SSE events. */
	thinking?: string;
	/** Tool invocations captured during the assistant turn. */
	toolCalls?: ChatToolCall[];
	/** Whether the assistant is still streaming this message. */
	isStreaming: boolean;
}

/**
 * Renders an assistant turn: collapsible reasoning panel, tool rows, and the
 * markdown response body. Hides each section when its data is empty so a plain
 * answer (no thinking, no tools) looks identical to the previous UI.
 */
export function AssistantMessage({
	content,
	thinking,
	toolCalls,
	isStreaming,
}: AssistantMessageProps): React.JSX.Element {
	const hasContent = content.length > 0;
	const hasThinking = Boolean(thinking && thinking.length > 0);
	const hasTools = Boolean(toolCalls && toolCalls.length > 0);
	// Show the spinner before any content, thinking, or tool activity has
	// arrived so the user gets immediate feedback that the request is in
	// flight. As soon as any piece of the response shows up the spinner
	// is replaced by the corresponding section.
	const showInitialLoader = isStreaming && !hasContent && !hasThinking && !hasTools;

	return (
		<Message from="assistant">
			<MessageContent>
				{showInitialLoader && (
					<div className="flex items-center gap-2 text-muted-foreground text-sm">
						<Loader />
						Thinking...
					</div>
				)}

				{hasThinking && (
					<Reasoning isStreaming={isStreaming && !hasContent}>
						<ReasoningTrigger />
						<ReasoningContent>{thinking ?? ''}</ReasoningContent>
					</Reasoning>
				)}

				{hasTools &&
					toolCalls?.map((call) => {
						const toolType = `tool-${call.name}` as ToolUIPart['type'];
						return (
							<Tool key={call.id} defaultOpen={false}>
								<ToolHeader state={toolStateFor(call)} type={toolType} />
								<ToolContent>
									<ToolInput input={call.input} />
									{call.result !== undefined && (
										<ToolOutput errorText={undefined} output={call.result} />
									)}
								</ToolContent>
							</Tool>
						);
					})}

				{hasContent && <MessageResponse>{content}</MessageResponse>}
			</MessageContent>
		</Message>
	);
}
