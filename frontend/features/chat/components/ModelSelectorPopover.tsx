'use client';

import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import type * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/** Stable model IDs available in the local visual-first selector. */
export type ChatModelId =
	| 'gemini-3-flash-preview'
	| 'gemini-3.1-flash-lite-preview'
	| 'gpt-5.5'
	| 'gpt-5.4'
	| 'claude-sonnet-4-6'
	| 'claude-opus-4-7'
	| 'claude-haiku-4-5';

/** Reasoning levels displayed next to the selected model. */
export type ChatReasoningLevel = 'low' | 'medium' | 'high' | 'extra-high';

type ChatModelOption = {
	/** Backend model identifier. */
	id: ChatModelId;
	/** Short label shown in the composer trigger. */
	shortName: string;
	/** Full label shown in menus. */
	name: string;
	/** Provider logo slug for models.dev. */
	provider: 'google' | 'openai' | 'anthropic';
};

type ReasoningOption = {
	/** Stable reasoning value. */
	id: ChatReasoningLevel;
	/** Human-facing label. */
	label: string;
};

const MODEL_OPTIONS: ChatModelOption[] = [
	{
		id: 'gemini-3-flash-preview',
		shortName: 'Gemini 3 Flash',
		name: 'Gemini 3 Flash Preview',
		provider: 'google',
	},
	{
		id: 'gemini-3.1-flash-lite-preview',
		shortName: 'Gemini Flash Lite',
		name: 'Gemini 3.1 Flash Lite Preview',
		provider: 'google',
	},
	{
		id: 'gpt-5.5',
		shortName: 'GPT-5.5',
		name: 'GPT-5.5',
		provider: 'openai',
	},
	{
		id: 'gpt-5.4',
		shortName: 'GPT-5.4',
		name: 'GPT-5.4',
		provider: 'openai',
	},
	{
		id: 'claude-sonnet-4-6',
		shortName: 'Claude Sonnet 4.6',
		name: 'Claude Sonnet 4.6',
		provider: 'anthropic',
	},
	{
		id: 'claude-opus-4-7',
		shortName: 'Claude Opus 4.7',
		name: 'Claude Opus 4.7',
		provider: 'anthropic',
	},
	{
		id: 'claude-haiku-4-5',
		shortName: 'Claude Haiku 4.5',
		name: 'Claude Haiku 4.5',
		provider: 'anthropic',
	},
];

const REASONING_OPTIONS: ReasoningOption[] = [
	{ id: 'low', label: 'Low' },
	{ id: 'medium', label: 'Medium' },
	{ id: 'high', label: 'High' },
	{ id: 'extra-high', label: 'Extra High' },
];

/**
 * Props for the compact model and reasoning selector used in the chat composer.
 */
export type ModelSelectorPopoverProps = {
	/** Currently selected chat model. */
	selectedModelId: ChatModelId;
	/** Currently selected reasoning level. */
	selectedReasoning: ChatReasoningLevel;
	/** Callback fired when the user chooses a model. */
	onSelectModel: (modelId: ChatModelId) => void;
	/** Callback fired when the user chooses a reasoning level. */
	onSelectReasoning: (reasoning: ChatReasoningLevel) => void;
};

function getModelOption(modelId: ChatModelId): ChatModelOption {
	const fallbackModel = MODEL_OPTIONS[0];

	if (!fallbackModel) {
		throw new Error('Model selector requires at least one model option.');
	}

	return MODEL_OPTIONS.find((model) => model.id === modelId) ?? fallbackModel;
}

function getReasoningLabel(reasoning: ChatReasoningLevel): string {
	return REASONING_OPTIONS.find((option) => option.id === reasoning)?.label ?? 'Medium';
}

function ProviderLogo({
	provider,
	className,
}: {
	provider: ChatModelOption['provider'];
	className?: string;
}): React.JSX.Element {
	return (
		<img
			alt={`${provider} logo`}
			className={cn('size-3 rounded-full dark:invert', className)}
			height={12}
			src={`https://models.dev/logos/${provider}.svg`}
			width={12}
		/>
	);
}

/**
 * Renders a Codex-like inline model selector with nested model and reasoning choices.
 */
export function ModelSelectorPopover({
	selectedModelId,
	selectedReasoning,
	onSelectModel,
	onSelectReasoning,
}: ModelSelectorPopoverProps): React.JSX.Element {
	const selectedModel = getModelOption(selectedModelId);
	const reasoningLabel = getReasoningLabel(selectedReasoning);
	const [menuOpen, setMenuOpen] = useState(false);
	const [tooltipOpen, setTooltipOpen] = useState(false);

	return (
		<DropdownMenu
			onOpenChange={(open) => {
				setMenuOpen(open);
				if (!open) {
					setTooltipOpen(false);
				}
			}}
		>
			<TooltipProvider disableHoverableContent>
				<Tooltip
					delayDuration={300}
					onOpenChange={(open) => {
						if (menuOpen) {
							return;
						}
						setTooltipOpen(open);
					}}
					open={menuOpen ? false : tooltipOpen}
				>
					<TooltipTrigger asChild>
						<DropdownMenuTrigger asChild>
							<Button
								aria-label="Select model and reasoning"
								className="h-7 gap-1 rounded-[7px] border-0 bg-transparent px-2 text-[12px] font-normal text-muted-foreground hover:bg-foreground/[0.1] hover:text-foreground aria-expanded:bg-foreground/[0.08] data-[state=open]:bg-foreground/[0.08]"
								size="xs"
								type="button"
								variant="ghost"
							>
								<span className="text-foreground">{selectedModel.shortName}</span>
								<span>{reasoningLabel}</span>
								<ChevronDownIcon aria-hidden="true" className="size-3" />
							</Button>
						</DropdownMenuTrigger>
					</TooltipTrigger>
					<TooltipContent side="top">Choose model and reasoning level</TooltipContent>
				</Tooltip>
			</TooltipProvider>
			<DropdownMenuContent
				align="end"
				className="chat-composer-dropdown-menu min-w-48"
				side="top"
				sideOffset={8}
			>
				<DropdownMenuLabel className="px-2 py-1.5">Intelligence</DropdownMenuLabel>
				<DropdownMenuGroup>
					{REASONING_OPTIONS.map((option) => (
						<DropdownMenuItem
							className="justify-between"
							key={option.id}
							onSelect={() => onSelectReasoning(option.id)}
						>
							<span>{option.label}</span>
							{selectedReasoning === option.id ? (
								<CheckIcon
									aria-hidden="true"
									className="size-3.5 text-foreground"
								/>
							) : null}
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>
						<ProviderLogo provider={selectedModel.provider} />
						<span className="min-w-0 flex-1 truncate">{selectedModel.shortName}</span>
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent
						className="chat-composer-dropdown-menu min-w-44"
						sideOffset={8}
					>
						<DropdownMenuLabel className="px-2 py-1.5">Model</DropdownMenuLabel>
						{MODEL_OPTIONS.map((model) => (
							<DropdownMenuItem
								className="justify-between"
								key={model.id}
								onSelect={() => onSelectModel(model.id)}
							>
								<span className="flex min-w-0 items-center gap-2">
									<ProviderLogo provider={model.provider} />
									<span className="truncate">{model.name}</span>
								</span>
								{selectedModelId === model.id ? (
									<CheckIcon
										aria-hidden="true"
										className="size-3.5 text-foreground"
									/>
								) : null}
							</DropdownMenuItem>
						))}
					</DropdownMenuSubContent>
				</DropdownMenuSub>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
