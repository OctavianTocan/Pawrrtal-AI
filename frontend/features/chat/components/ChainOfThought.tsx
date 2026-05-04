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

/**
 * Single rail item.
 *
 * Layout copies thirdear's chain-of-thought: an absolutely-positioned
 * 1px connector line runs through the row, and the leading marker
 * (bullet for thinking, status circle for tools) sits on `bg-background`
 * with positive z-index to "punch through" the line — so the rail looks
 * like one continuous vertical line interrupted by markers, not a
 * sequence of independent segments.
 */
function RailRow({
	marker,
	showConnector,
	children,
}: {
	marker: ReactNode;
	showConnector: boolean;
	children: ReactNode;
}): ReactNode {
	return (
		<div className="relative flex items-start gap-2 py-1">
			{showConnector ? (
				<span
					aria-hidden="true"
					className="absolute top-6 bottom-1 left-[7px] w-px bg-border"
				/>
			) : null}
			<span className="relative z-10 flex h-5 w-4 shrink-0 items-center justify-center bg-background">
				{marker}
			</span>
			<div className="min-w-0 flex-1">{children}</div>
		</div>
	);
}

/**
 * Render a single tool step. Active steps shimmer; completed steps get a
 * filled success-tinted check so the user can scan the chain at a glance.
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

	const marker = isComplete ? (
		<CheckIcon className="size-3 text-success" strokeWidth={3} aria-hidden="true" />
	) : (
		<span aria-hidden="true" className="size-1.5 rounded-full bg-muted-foreground/60" />
	);

	return (
		<RailRow marker={marker} showConnector={showConnector}>
			<div className="flex flex-col gap-1">
				<div className="flex items-center gap-1.5 text-sm leading-5">
					<Icon aria-hidden="true" className="size-3.5 text-muted-foreground" />
					{isComplete ? (
						<span className="text-foreground">{label}</span>
					) : (
						<Shimmer duration={1.2}>{label}</Shimmer>
					)}
				</div>
				<ToolResultChipsRow chips={chips} />
			</div>
		</RailRow>
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
		<RailRow
			marker={
				<span aria-hidden="true" className="text-muted-foreground/70 leading-none">
					•
				</span>
			}
			showConnector={showConnector}
		>
			<div className="space-y-1 text-sm leading-5 text-muted-foreground">
				{title ? <div className="font-medium text-foreground">{title}</div> : null}
				{content ? (
					<Streamdown className="text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
						{content}
					</Streamdown>
				) : null}
			</div>
		</RailRow>
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
			<div className={cn('flex items-center gap-1 text-sm text-muted-foreground')}>
				<ChevronRightIcon aria-hidden="true" className="size-3.5" />
				<Shimmer duration={1.2}>Thinking...</Shimmer>
			</div>
		);
	}

	return (
		<div>
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
