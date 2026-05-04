'use client';

import { AlertTriangleIcon, BrainIcon, ChevronDownIcon, RefreshCwIcon } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { Loader } from '@/components/ai-elements/loader';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { formatThinkingDuration } from '../thinking-parser';
import { extractToolChips, type ToolResultChips } from '../tool-result-parsers';
import type { ChatTimelineEntry, ChatToolCall } from '../types';
import { ChainOfThought } from './ChainOfThought';
import { ReplyActionsRow } from './ReplyActionsRow';

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
	/** Arrival-ordered list of thinking bursts and tool invocations. */
	timeline?: ChatTimelineEntry[];
	/** Whether the assistant is still streaming this message. */
	isStreaming: boolean;
	/** Whether this turn ended in a stream-level error. */
	isFailed?: boolean;
	/** Total reasoning duration (whole seconds) — only set after streaming. */
	thinkingDurationSeconds?: number;
	/** Whether this row's copy button should currently render its "Copied!" state. */
	isCopied?: boolean;
	/** Copy the response body to the clipboard. */
	onCopy?: () => void;
	/** Re-run the assistant turn for this message. */
	onRegenerate?: () => void;
	/** Whether a regeneration request is currently in flight for this row. */
	isRegenerating?: boolean;
}

/** Default state for messages without any chip data. */
const EMPTY_CHIPS: ToolResultChips = {
	webSources: [],
	calendarEvents: [],
	memoryResults: [],
};

/**
 * Trigger label rendered next to the brain icon. Shows a Shimmer while the
 * model is still reasoning and a static duration label once finished.
 */
function ThinkingTriggerLabel({
	isStreaming,
	durationSeconds,
}: {
	isStreaming: boolean;
	durationSeconds: number | undefined;
}): ReactNode {
	if (isStreaming) return <Shimmer duration={1.2}>Thinking...</Shimmer>;
	if (durationSeconds === undefined) return <span>Thought for a few seconds</span>;
	return <span>{formatThinkingDuration(durationSeconds)}</span>;
}

/**
 * Collapsible reasoning panel: brain-icon trigger plus chain-of-thought body.
 * Mounted only when there is something to show (thinking text or tool steps),
 * so plain answers stay free of UI chrome.
 */
function ReasoningPanel({
	timeline,
	toolCallsById,
	chipsByToolId,
	isStreaming,
	durationSeconds,
}: {
	timeline: ChatTimelineEntry[];
	toolCallsById: Map<string, ChatToolCall>;
	chipsByToolId: Map<string, ToolResultChips>;
	isStreaming: boolean;
	durationSeconds: number | undefined;
}): ReactNode {
	const [isOpen, setIsOpen] = useState<boolean>(true);

	return (
		<Collapsible className="not-prose mb-3" onOpenChange={setIsOpen} open={isOpen}>
			<CollapsibleTrigger
				className={cn(
					'flex w-full items-center gap-2 text-muted-foreground text-sm',
					'transition-colors hover:text-foreground'
				)}
			>
				<BrainIcon className="size-4" />
				<ThinkingTriggerLabel durationSeconds={durationSeconds} isStreaming={isStreaming} />
				<ChevronDownIcon
					className={cn(
						'size-4 transition-transform',
						isOpen ? 'rotate-180' : 'rotate-0'
					)}
				/>
			</CollapsibleTrigger>
			<CollapsibleContent
				className={cn(
					'mt-3 ml-1 border-border border-l pl-3',
					'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
					'data-[state=closed]:animate-out data-[state=open]:animate-in'
				)}
			>
				<ChainOfThought
					chipsByToolId={chipsByToolId}
					timeline={timeline}
					toolCallsById={toolCallsById}
				/>
			</CollapsibleContent>
		</Collapsible>
	);
}

/**
 * Render a failed assistant turn: error banner with the backend message and a
 * Retry button that wraps `onRegenerate`. Hidden when there is no error text.
 */
function FailedReplyBanner({
	content,
	onRetry,
	isRetrying,
}: {
	content: string;
	onRetry?: () => void;
	isRetrying?: boolean;
}): ReactNode {
	return (
		<div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-destructive text-sm">
			<AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
			<div className="flex-1">
				<MessageResponse className="text-destructive">{content}</MessageResponse>
				{onRetry ? (
					<Button
						aria-label="Retry"
						className="mt-2 h-7 gap-1.5 px-2 text-destructive text-xs hover:bg-destructive/10 hover:text-destructive"
						disabled={isRetrying}
						onClick={onRetry}
						size="sm"
						type="button"
						variant="ghost"
					>
						<RefreshCwIcon
							className={cn('size-3.5', isRetrying ? 'animate-spin' : null)}
						/>
						{isRetrying ? 'Retrying' : 'Retry'}
					</Button>
				) : null}
			</div>
		</div>
	);
}

/**
 * Synthesise an arrival-order timeline from a message that doesn't have one.
 *
 * Live-streamed messages always have a `timeline`, but server-rendered
 * history is just `role` + `content` so the renderer needs a fallback view —
 * single thinking burst followed by every tool call in the order they appear.
 */
function buildEffectiveTimeline(
	timeline: ChatTimelineEntry[] | undefined,
	thinking: string | undefined,
	toolCalls: ChatToolCall[] | undefined
): ChatTimelineEntry[] {
	if (timeline && timeline.length > 0) return timeline;
	const synthesised: ChatTimelineEntry[] = [];
	if (thinking) synthesised.push({ kind: 'thinking', text: thinking });
	for (const call of toolCalls ?? []) {
		synthesised.push({ kind: 'tool', toolCallId: call.id });
	}
	return synthesised;
}

/**
 * Renders an assistant turn: chronologically-interleaved chain-of-thought
 * inside a collapsible reasoning panel, the markdown response body, and the
 * reply-action toolbar. Hides each section when its data is empty so a plain
 * answer (no thinking, no tools) reads identically to the previous UI.
 */
export function AssistantMessage({
	content,
	thinking,
	toolCalls,
	timeline,
	isStreaming,
	isFailed,
	thinkingDurationSeconds,
	isCopied,
	onCopy,
	onRegenerate,
	isRegenerating,
}: AssistantMessageProps): ReactNode {
	const hasContent = content.length > 0;
	const hasThinking = Boolean(thinking && thinking.length > 0);
	const hasTools = Boolean(toolCalls && toolCalls.length > 0);
	const showInitialLoader = isStreaming && !hasContent && !hasThinking && !hasTools && !isFailed;

	// Pre-compute tool indexing + chip parsing once per render so the
	// chain-of-thought renderer can dereference everything without recomputing
	// per child.
	const toolCallsById = useMemo(() => {
		const map = new Map<string, ChatToolCall>();
		for (const call of toolCalls ?? []) map.set(call.id, call);
		return map;
	}, [toolCalls]);

	const chipsByToolId = useMemo(() => {
		const map = new Map<string, ToolResultChips>();
		for (const call of toolCalls ?? []) {
			map.set(
				call.id,
				call.result === undefined ? EMPTY_CHIPS : extractToolChips(call.name, call.result)
			);
		}
		return map;
	}, [toolCalls]);

	const effectiveTimeline = useMemo(
		() => buildEffectiveTimeline(timeline, thinking, toolCalls),
		[timeline, thinking, toolCalls]
	);

	const showReasoningPanel = hasThinking || hasTools;
	const showActions = !isStreaming && !isFailed && (Boolean(onCopy) || Boolean(onRegenerate));

	return (
		<Message from="assistant">
			<MessageContent>
				{showInitialLoader ? (
					<div className="flex items-center gap-2 text-muted-foreground text-sm">
						<Loader />
						<Shimmer duration={1.2}>Thinking...</Shimmer>
					</div>
				) : null}

				{showReasoningPanel ? (
					<ReasoningPanel
						chipsByToolId={chipsByToolId}
						durationSeconds={thinkingDurationSeconds}
						isStreaming={isStreaming && !hasContent && !isFailed}
						timeline={effectiveTimeline}
						toolCallsById={toolCallsById}
					/>
				) : null}

				{isFailed && hasContent ? (
					<FailedReplyBanner
						content={content}
						isRetrying={isRegenerating}
						onRetry={onRegenerate}
					/>
				) : null}

				{hasContent && !isFailed ? <MessageResponse>{content}</MessageResponse> : null}

				{showActions ? (
					<ReplyActionsRow
						isCopied={isCopied}
						isRegenerating={isRegenerating}
						onCopy={onCopy}
						onRegenerate={onRegenerate}
					/>
				) : null}
			</MessageContent>
		</Message>
	);
}
