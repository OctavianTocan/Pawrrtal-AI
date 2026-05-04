'use client';

import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import type * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Stable model IDs available in the local visual-first selector.
 *
 * Declared as a `const` tuple (rather than only a union) so callers can validate
 * persisted strings at runtime — see {@link ChatContainer}'s storage guards.
 */
export const CHAT_MODEL_IDS = [
	'gemini-3-flash-preview',
	'gemini-3.1-flash-lite-preview',
	'gpt-5.5',
	'gpt-5.4',
	'claude-sonnet-4-6',
	'claude-opus-4-7',
	'claude-haiku-4-5',
] as const;

/** Stable model IDs available in the local visual-first selector. */
export type ChatModelId = (typeof CHAT_MODEL_IDS)[number];

/** Reasoning levels displayed next to the selected model. */
export const CHAT_REASONING_LEVELS = ['low', 'medium', 'high', 'extra-high'] as const;

/** Reasoning levels displayed next to the selected model. */
export type ChatReasoningLevel = (typeof CHAT_REASONING_LEVELS)[number];

/** Stable provider IDs grouped at the top of the model menu. */
const PROVIDER_IDS = ['anthropic', 'openai', 'google'] as const;
type ProviderId = (typeof PROVIDER_IDS)[number];

type ChatModelOption = {
	/** Backend model identifier. */
	id: ChatModelId;
	/** Short label shown in the composer trigger. */
	shortName: string;
	/** Full label shown in menus. */
	name: string;
	/** Provider logo slug for models.dev. */
	provider: ProviderId;
	/** Short tagline rendered as the secondary line in the model menu. */
	description: string;
};

type ReasoningOption = {
	/** Stable reasoning value. */
	id: ChatReasoningLevel;
	/** Human-facing label. */
	label: string;
};

const MODEL_OPTIONS: ChatModelOption[] = [
	{
		id: 'claude-opus-4-7',
		shortName: 'Claude Opus 4.7',
		name: 'Claude Opus 4.7',
		provider: 'anthropic',
		description: 'Most capable for ambitious work',
	},
	{
		id: 'claude-sonnet-4-6',
		shortName: 'Claude Sonnet 4.6',
		name: 'Claude Sonnet 4.6',
		provider: 'anthropic',
		description: 'Balanced for everyday tasks',
	},
	{
		id: 'claude-haiku-4-5',
		shortName: 'Claude Haiku 4.5',
		name: 'Claude Haiku 4.5',
		provider: 'anthropic',
		description: 'Fastest for quick answers',
	},
	{
		id: 'gpt-5.5',
		shortName: 'GPT-5.5',
		name: 'GPT-5.5',
		provider: 'openai',
		description: "OpenAI's flagship reasoning",
	},
	{
		id: 'gpt-5.4',
		shortName: 'GPT-5.4',
		name: 'GPT-5.4',
		provider: 'openai',
		description: 'Faster GPT for everyday tasks',
	},
	{
		id: 'gemini-3-flash-preview',
		shortName: 'Gemini 3 Flash',
		name: 'Gemini 3 Flash Preview',
		provider: 'google',
		description: "Google's frontier multimodal",
	},
	{
		id: 'gemini-3.1-flash-lite-preview',
		shortName: 'Gemini Flash Lite',
		name: 'Gemini 3.1 Flash Lite Preview',
		provider: 'google',
		description: 'Light and fast Gemini',
	},
];

/** Display label for each provider — title-case for menu rows. */
const PROVIDER_LABELS: Record<ProviderId, string> = {
	anthropic: 'Anthropic',
	openai: 'OpenAI',
	google: 'Google',
};

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

/** Models grouped by provider, preserving the declaration order of MODEL_OPTIONS. */
function getModelsByProvider(provider: ProviderId): ChatModelOption[] {
	return MODEL_OPTIONS.filter((model) => model.provider === provider);
}

function ProviderLogo({
	provider,
	className,
}: {
	provider: ProviderId;
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
 * Renders the chat composer's model selector. Top-level rows group models by
 * provider — each provider opens a sub-menu with its full model lineup. The
 * `Thinking` row at the bottom is a peer sub-menu with the four reasoning
 * levels and a descriptive secondary line, mirroring the layout used by the
 * Craft Agents reference design.
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
				className="chat-composer-dropdown-menu min-w-56"
				side="top"
				sideOffset={8}
			>
				{PROVIDER_IDS.map((providerId) => {
					const models = getModelsByProvider(providerId);
					if (models.length === 0) return null;

					const isActiveProvider = selectedModel.provider === providerId;

					return (
						<DropdownMenuSub key={providerId}>
							<DropdownMenuSubTrigger className="gap-2">
								<ProviderLogo provider={providerId} />
								<span className="min-w-0 flex-1 truncate">
									{PROVIDER_LABELS[providerId]}
								</span>
								{isActiveProvider ? (
									<CheckIcon
										aria-hidden="true"
										className="size-3.5 text-foreground"
									/>
								) : null}
							</DropdownMenuSubTrigger>
							<DropdownMenuSubContent
								className="chat-composer-dropdown-menu min-w-64"
								sideOffset={8}
							>
								{models.map((model) => (
									<DropdownMenuItem
										className="gap-2"
										key={model.id}
										onSelect={() => onSelectModel(model.id)}
									>
										<div className="flex min-w-0 flex-1 flex-col">
											<span className="truncate text-foreground">
												{model.shortName}
											</span>
											<span className="truncate text-[11px] text-muted-foreground">
												{model.description}
											</span>
										</div>
										{selectedModelId === model.id ? (
											<CheckIcon
												aria-hidden="true"
												className="size-3.5 shrink-0 text-foreground"
											/>
										) : null}
									</DropdownMenuItem>
								))}
							</DropdownMenuSubContent>
						</DropdownMenuSub>
					);
				})}

				<DropdownMenuSeparator />

				<DropdownMenuSub>
					<DropdownMenuSubTrigger className="gap-2">
						<div className="flex min-w-0 flex-1 flex-col">
							<span className="truncate text-foreground">
								Thinking: {reasoningLabel}
							</span>
							<span className="truncate text-[11px] text-muted-foreground">
								Extended reasoning depth
							</span>
						</div>
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent
						className="chat-composer-dropdown-menu min-w-32"
						sideOffset={8}
					>
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
					</DropdownMenuSubContent>
				</DropdownMenuSub>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
