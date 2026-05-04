'use client';

import { CheckIcon, ChevronRightIcon } from 'lucide-react';
import { memo, type ReactNode, useMemo } from 'react';
import { Streamdown } from 'streamdown';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { cn } from '@/lib/utils';
import { getCompletedToolLabel, getToolIcon, getToolLabel } from '../thinking-constants';
import { parseThinkingSections } from '../thinking-parser';
import type { ToolResultChips } from '../tool-result-parsers';
import type { ChatTimelineEntry, ChatToolCall } from '../types';
import { ToolResultChipsRow } from './ToolResultChipsRow';

/** Connector segment that visually links steps in the chain-of-thought rail. */
function StepConnector(): ReactNode {
	return <span className="ml-[7px] block h-3 w-px bg-border" aria-hidden="true" />;
}

/**
 * Render a single tool step as a row with: status bullet, icon, label, and
 * (when results are available) a chip row beneath.
 */
function ToolStep({
	call,
	chips,
	showConnector,
}: {
	call: ChatToolCall;
	chips: ToolResultChips;
	showConnector: boolean;
}): ReactNode {
	const Icon = getToolIcon(call.name);
	const isComplete = call.status === 'completed';
	const label = isComplete ? getCompletedToolLabel(call.name) : getToolLabel(call.name);

	return (
		<div>
			<div className="flex items-start gap-2">
				<span
					aria-hidden="true"
					className={cn(
						'mt-1 flex size-3.5 shrink-0 items-center justify-center rounded-full',
						isComplete
							? 'bg-emerald-500/15 text-emerald-600'
							: 'bg-muted text-muted-foreground'
					)}
				>
					{isComplete ? <CheckIcon className="size-2.5" strokeWidth={3} /> : null}
				</span>
				<div className="min-w-0 flex-1 space-y-1.5">
					<div className="flex items-center gap-1.5 text-sm">
						<Icon className="size-3.5 text-muted-foreground" />
						{isComplete ? (
							<span className="text-foreground">{label}</span>
						) : (
							<Shimmer duration={1.2}>{label}</Shimmer>
						)}
					</div>
					<ToolResultChipsRow chips={chips} />
				</div>
			</div>
			{showConnector ? <StepConnector /> : null}
		</div>
	);
}

/** A single rendered thinking section: optional header, then markdown body. */
function ThinkingStep({
	title,
	content,
	showConnector,
}: {
	title: string;
	content: string;
	showConnector: boolean;
}): ReactNode {
	return (
		<div>
			<div className="flex items-start gap-2">
				<span
					aria-hidden="true"
					className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-muted-foreground/60"
				/>
				<div className="min-w-0 flex-1 space-y-1 text-muted-foreground text-sm leading-snug">
					{title ? <div className="font-medium text-foreground">{title}</div> : null}
					{content ? <Streamdown className="text-sm">{content}</Streamdown> : null}
				</div>
			</div>
			{showConnector ? <StepConnector /> : null}
		</div>
	);
}

/**
 * Props for {@link ChainOfThought}.
 */
interface ChainOfThoughtProps {
	/** Arrival-ordered timeline of thinking bursts and tool invocations. */
	timeline: ChatTimelineEntry[];
	/** Tool calls indexed by id so the timeline can dereference each tool slot. */
	toolCallsById: Map<string, ChatToolCall>;
	/** Pre-parsed source chips per tool call id (web/calendar/memory). */
	chipsByToolId: Map<string, ToolResultChips>;
}

const EMPTY_CHIPS: ToolResultChips = {
	webSources: [],
	calendarEvents: [],
	memoryResults: [],
};

/**
 * Chronologically-ordered chain-of-thought renderer.
 *
 * Walks the message's `timeline` (arrival order of thinking bursts and tool
 * calls) so the user sees reasoning and tool steps interleaved exactly as
 * they happened. Each `thinking` slot is split into sub-sections by
 * {@link parseThinkingSections} so Gemini-style `## Title` headings turn
 * into individual bulleted steps.
 */
export const ChainOfThought = memo(function ChainOfThought({
	timeline,
	toolCallsById,
	chipsByToolId,
}: ChainOfThoughtProps) {
	const items = useMemo(() => {
		type Item =
			| { kind: 'thinking'; title: string; content: string }
			| { kind: 'tool'; call: ChatToolCall; chips: ToolResultChips };
		const flat: Item[] = [];
		for (const entry of timeline) {
			if (entry.kind === 'thinking') {
				const sections = parseThinkingSections(entry.text);
				for (const section of sections) {
					flat.push({ kind: 'thinking', title: section.title, content: section.content });
				}
				continue;
			}
			const call = toolCallsById.get(entry.toolCallId);
			if (!call) continue;
			flat.push({
				kind: 'tool',
				call,
				chips: chipsByToolId.get(entry.toolCallId) ?? EMPTY_CHIPS,
			});
		}
		return flat;
	}, [timeline, toolCallsById, chipsByToolId]);

	if (items.length === 0) {
		return (
			<div className="flex items-center gap-1 text-muted-foreground text-sm">
				<ChevronRightIcon className="size-3.5" />
				<Shimmer duration={1.2}>Thinking...</Shimmer>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			{items.map((item, index) => {
				const showConnector = index < items.length - 1;
				if (item.kind === 'tool') {
					return (
						<ToolStep
							call={item.call}
							chips={item.chips}
							key={`tool-${item.call.id}`}
							showConnector={showConnector}
						/>
					);
				}
				return (
					<ThinkingStep
						content={item.content}
						key={`thinking-${index}-${item.title}`}
						showConnector={showConnector}
						title={item.title}
					/>
				);
			})}
		</div>
	);
});
