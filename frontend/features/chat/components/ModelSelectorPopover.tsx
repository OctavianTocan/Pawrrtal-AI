'use client';

import {
	DropdownMenu,
	DropdownSubmenu,
	DropdownSubmenuContent,
	DropdownSubmenuTrigger,
	useDropdownContext,
} from '@octavian-tocan/react-dropdown';
import { ChevronDownIcon } from 'lucide-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTooltipDropdown } from '@/hooks/use-tooltip-dropdown';
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

/** Discriminated union of root-menu rows. */
type RootRow = { kind: 'provider'; provider: ProviderId } | { kind: 'thinking' };

const ROOT_ROWS: readonly RootRow[] = [
	{ kind: 'provider', provider: 'anthropic' },
	{ kind: 'provider', provider: 'openai' },
	{ kind: 'provider', provider: 'google' },
	{ kind: 'thinking' },
];

/** Stable React key for each root row. */
function rootRowKey(row: RootRow): string {
	return row.kind === 'provider' ? `provider:${row.provider}` : 'thinking';
}

/** Display string used by the keyboard type-ahead. */
function rootRowDisplay(row: RootRow): string {
	return row.kind === 'provider' ? PROVIDER_LABELS[row.provider] : 'Thinking';
}

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
 * Submenu row that selects a model and closes the root dropdown.
 *
 * Lives inside the root `DropdownMenu`'s React tree, so `useDropdownContext`
 * resolves to the root's context — closing it on selection collapses the
 * entire submenu chain along with the root panel.
 */
function ModelRow({
	model,
	isSelected,
	onSelect,
}: {
	model: ChatModelOption;
	isSelected: boolean;
	onSelect: (modelId: ChatModelId) => void;
}): React.JSX.Element {
	const { closeDropdown } = useDropdownContext();
	return (
		<button
			type="button"
			className={cn(
				'flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-foreground/[0.04]',
				isSelected && 'bg-foreground/[0.07] font-medium'
			)}
			onClick={() => {
				onSelect(model.id);
				closeDropdown();
			}}
		>
			<div className="flex min-w-0 flex-1 flex-col text-left">
				<span className="truncate text-foreground">{model.shortName}</span>
				<span className="truncate text-[11px] text-muted-foreground">
					{model.description}
				</span>
			</div>
			{isSelected ? (
				<span className="ml-1 size-1.5 shrink-0 rounded-full bg-foreground" />
			) : null}
		</button>
	);
}

/**
 * Submenu row that selects a reasoning level and closes the root dropdown.
 */
function ReasoningRow({
	option,
	isSelected,
	onSelect,
}: {
	option: ReasoningOption;
	isSelected: boolean;
	onSelect: (reasoning: ChatReasoningLevel) => void;
}): React.JSX.Element {
	const { closeDropdown } = useDropdownContext();
	return (
		<button
			type="button"
			className={cn(
				'flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-foreground/[0.04]',
				isSelected && 'bg-foreground/[0.07]'
			)}
			onClick={() => {
				onSelect(option.id);
				closeDropdown();
			}}
		>
			<span>{option.label}</span>
		</button>
	);
}

/**
 * Renders the chat composer's model selector. Top-level rows group models by
 * provider — each provider opens a flyout submenu with its full model lineup.
 * The `Thinking` row at the bottom is a peer submenu with the four reasoning
 * levels and a descriptive secondary line, mirroring the layout used by the
 * Craft Agents reference design.
 *
 * Built on `@octavian-tocan/react-dropdown` (the vendored package) to stay
 * consistent with `AutoReviewSelector` and `NavUser`. The package's
 * `DropdownSubmenu` family provides Radix-equivalent flyout submenus with
 * hover-open + ArrowRight-open keyboard semantics.
 */
export function ModelSelectorPopover({
	selectedModelId,
	selectedReasoning,
	onSelectModel,
	onSelectReasoning,
}: ModelSelectorPopoverProps): React.JSX.Element {
	const selectedModel = getModelOption(selectedModelId);
	const reasoningLabel = getReasoningLabel(selectedReasoning);
	const { menuOpen, tooltipOpen, handleMenuOpenChange, handleTooltipOpenChange } =
		useTooltipDropdown();

	return (
		<TooltipProvider disableHoverableContent>
			<Tooltip onOpenChange={handleTooltipOpenChange} open={tooltipOpen}>
				<TooltipTrigger asChild>
					<span className="inline-flex">
						<DropdownMenu<RootRow>
							asChild
							usePortal
							placement="top"
							align="start"
							// Submenu rows handle their own selection + closeDropdown,
							// so the root menu's onSelect is unused but required.
							closeOnSelect={false}
							contentClassName="chat-composer-dropdown-menu popover-styled p-1 min-w-56"
							getItemDisplay={rootRowDisplay}
							getItemKey={rootRowKey}
							// Render a separator above the Thinking row to break the
							// providers section from the reasoning section.
							getItemSeparator={(row) => row.kind === 'thinking'}
							items={ROOT_ROWS}
							onOpenChange={handleMenuOpenChange}
							onSelect={() => {
								// no-op — submenu rows handle their own selection
							}}
							trigger={
								<Button
									aria-label="Select model and reasoning"
									className={cn(
										'h-7 gap-1 rounded-[7px] border-0 bg-transparent px-2 text-[12px] font-normal text-muted-foreground hover:bg-foreground/[0.1] hover:text-foreground',
										menuOpen && 'bg-foreground/[0.08]'
									)}
									size="xs"
									type="button"
									variant="ghost"
								>
									<span className="text-foreground">
										{selectedModel.shortName}
									</span>
									<span>{reasoningLabel}</span>
									<ChevronDownIcon aria-hidden="true" className="size-3" />
								</Button>
							}
							renderItem={(row) => {
								if (row.kind === 'provider') {
									const models = getModelsByProvider(row.provider);
									if (models.length === 0) return null;
									const isActiveProvider =
										selectedModel.provider === row.provider;
									return (
										<DropdownSubmenu>
											{/* `DropdownSubmenuTrigger` bakes in its own
											    flyout chevron — rendering an explicit
											    ChevronRightIcon here used to produce two
											    arrows side-by-side. We only emit the
											    "active provider" check now; the library's
											    chevron handles the "expand" affordance for
											    every row. */}
											<DropdownSubmenuTrigger
												className={cn(
													'flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-foreground/[0.04]',
													isActiveProvider && 'bg-foreground/[0.07]'
												)}
											>
												<ProviderLogo provider={row.provider} />
												<span className="min-w-0 flex-1 truncate text-left">
													{PROVIDER_LABELS[row.provider]}
												</span>
											</DropdownSubmenuTrigger>
											<DropdownSubmenuContent className="chat-composer-dropdown-menu popover-styled p-1 min-w-64">
												{models.map((model) => (
													<ModelRow
														key={model.id}
														model={model}
														isSelected={selectedModelId === model.id}
														onSelect={onSelectModel}
													/>
												))}
											</DropdownSubmenuContent>
										</DropdownSubmenu>
									);
								}
								// 'thinking' row
								return (
									<DropdownSubmenu>
										<DropdownSubmenuTrigger className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-foreground/[0.04]">
											<div className="flex min-w-0 flex-1 flex-col text-left">
												<span className="truncate text-foreground">
													Thinking: {reasoningLabel}
												</span>
												<span className="truncate text-[11px] text-muted-foreground">
													Extended reasoning depth
												</span>
											</div>
										</DropdownSubmenuTrigger>
										<DropdownSubmenuContent className="chat-composer-dropdown-menu popover-styled p-1 min-w-32">
											{REASONING_OPTIONS.map((option) => (
												<ReasoningRow
													key={option.id}
													option={option}
													isSelected={selectedReasoning === option.id}
													onSelect={onSelectReasoning}
												/>
											))}
										</DropdownSubmenuContent>
									</DropdownSubmenu>
								);
							}}
						/>
					</span>
				</TooltipTrigger>
				<TooltipContent side="top">Choose model and reasoning level</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
