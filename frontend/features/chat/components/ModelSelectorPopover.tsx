'use client';

import {
	DropdownMenu,
	DropdownSubmenu,
	DropdownSubmenuContent,
	DropdownSubmenuTrigger,
	useDropdownContext,
} from '@octavian-tocan/react-dropdown';
import { CheckIcon, ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import type * as React from 'react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTooltipDropdown } from '@/hooks/use-tooltip-dropdown';
import { cn } from '@/lib/utils';
import { type CatalogModel, type ModelProvider, useModels } from '../hooks/use-models';

/**
 * Stable model identifier sent back to the backend.  Widened to `string`
 * because the source of truth lives in `backend/app/core/models_catalog.py`
 * (exposed via `GET /api/v1/models`); the runtime guard in
 * {@link ChatContainer} keeps the persisted value honest while the
 * catalog loads.
 */
export type ChatModelId = string;

/** Reasoning levels displayed next to the selected model. */
export const CHAT_REASONING_LEVELS = ['low', 'medium', 'high', 'extra-high'] as const;

/** Reasoning levels displayed next to the selected model. */
export type ChatReasoningLevel = (typeof CHAT_REASONING_LEVELS)[number];

/** Backend grammar for the discrete reasoning-effort knob. */
export type BackendReasoningEffort = 'low' | 'medium' | 'high' | 'max';

/**
 * Translate the user-facing reasoning level into the backend wire grammar.
 *
 * The composer labels its top tier "Extra High" (a Pawrrtal-specific
 * label that pre-dates the backend wire); the backend grammar mirrors
 * the Claude SDK's `effort` enum, where the top tier is `"max"`.  The
 * mapping is exhaustive on {@link ChatReasoningLevel} so adding a new
 * level forces a TypeScript error here.
 *
 * @param level - Persisted reasoning level from the composer popover.
 * @returns The backend's reasoning-effort string for the chat request.
 */
const REASONING_TO_BACKEND_EFFORT = {
	low: 'low',
	medium: 'medium',
	high: 'high',
	'extra-high': 'max',
} as const satisfies Record<ChatReasoningLevel, BackendReasoningEffort>;

export function reasoningLevelToBackendEffort(level: ChatReasoningLevel): BackendReasoningEffort {
	return REASONING_TO_BACKEND_EFFORT[level];
}

/** Stable provider IDs the menu can group rows under. */
const PROVIDER_ORDER: readonly ModelProvider[] = ['anthropic', 'google'];

/** Display label for each provider — title-case for menu rows. */
const PROVIDER_LABELS: Record<ModelProvider, string> = {
	anthropic: 'Anthropic',
	google: 'Google',
};

type ReasoningOption = {
	/** Stable reasoning value. */
	id: ChatReasoningLevel;
	/** Human-facing label. */
	label: string;
};

// Mapped by level so adding a `ChatReasoningLevel` member forces an entry
// here at compile time (the `satisfies Record<...>` constraint fails
// otherwise).  The flat array consumed by the menu render is derived
// from `CHAT_REASONING_LEVELS` to preserve declaration order.
const REASONING_OPTION_BY_LEVEL = {
	low: { id: 'low', label: 'Low' },
	medium: { id: 'medium', label: 'Medium' },
	high: { id: 'high', label: 'High' },
	'extra-high': { id: 'extra-high', label: 'Extra High' },
} as const satisfies Record<ChatReasoningLevel, ReasoningOption>;

const REASONING_OPTIONS: readonly ReasoningOption[] = CHAT_REASONING_LEVELS.map(
	(level) => REASONING_OPTION_BY_LEVEL[level]
);

/**
 * Fallback catalog rendered while {@link useModels} is loading or after a
 * fetch failure.  Keeps the picker usable on a cold start; the canonical
 * grammar matches the backend so any selection survives the cutover.
 *
 * Listed in the same order as the backend catalog so the UI doesn't jump
 * when the real response replaces this list.
 */
const FALLBACK_CATALOG: readonly CatalogModel[] = [
	{
		canonical_id: 'anthropic/claude-opus-4-7',
		provider: 'anthropic',
		sdk_id: 'claude-opus-4-7',
		display_name: 'Claude Opus 4.7',
		short_name: 'Opus 4.7',
		description: 'Most capable for ambitious work',
		context_window: 200_000,
		supports_thinking: true,
		supports_tool_use: true,
		supports_prompt_cache: true,
		default_reasoning: 'medium',
	},
	{
		canonical_id: 'anthropic/claude-sonnet-4-6',
		provider: 'anthropic',
		sdk_id: 'claude-sonnet-4-6',
		display_name: 'Claude Sonnet 4.6',
		short_name: 'Sonnet 4.6',
		description: 'Balanced for everyday tasks',
		context_window: 200_000,
		supports_thinking: true,
		supports_tool_use: true,
		supports_prompt_cache: true,
		default_reasoning: 'medium',
	},
	{
		canonical_id: 'anthropic/claude-haiku-4-5',
		provider: 'anthropic',
		sdk_id: 'claude-haiku-4-5',
		display_name: 'Claude Haiku 4.5',
		short_name: 'Haiku 4.5',
		description: 'Fastest for quick answers',
		context_window: 200_000,
		supports_thinking: true,
		supports_tool_use: true,
		supports_prompt_cache: true,
		default_reasoning: 'low',
	},
	{
		canonical_id: 'google/gemini-3-flash-preview',
		provider: 'google',
		sdk_id: 'gemini-3-flash-preview',
		display_name: 'Gemini 3 Flash Preview',
		short_name: 'Gemini 3 Flash',
		description: "Google's frontier multimodal",
		context_window: 1_000_000,
		supports_thinking: false,
		supports_tool_use: true,
		supports_prompt_cache: false,
		default_reasoning: null,
	},
	{
		canonical_id: 'google/gemini-3.1-flash-lite-preview',
		provider: 'google',
		sdk_id: 'gemini-3.1-flash-lite-preview',
		display_name: 'Gemini 3.1 Flash Lite Preview',
		short_name: 'Gemini Flash Lite',
		description: 'Light and fast Gemini',
		context_window: 1_000_000,
		supports_thinking: false,
		supports_tool_use: true,
		supports_prompt_cache: false,
		default_reasoning: null,
	},
];

/** Discriminated union of root-menu rows. */
type RootRow = { kind: 'provider'; provider: ModelProvider } | { kind: 'thinking' };

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

/**
 * Find a model in the active catalog by either canonical id or bare SDK id.
 *
 * Older persisted selections store the bare form (`"gemini-3-flash-preview"`)
 * while the catalog publishes the canonical form (`"google/gemini-3-flash-preview"`);
 * matching on both keeps the chip and the active-provider checkmark correct
 * across the cutover.
 */
function findModel(
	catalog: readonly CatalogModel[],
	modelId: ChatModelId
): CatalogModel | undefined {
	return catalog.find((model) => model.canonical_id === modelId || model.sdk_id === modelId);
}

function getReasoningLabel(reasoning: ChatReasoningLevel): string {
	return REASONING_OPTIONS.find((option) => option.id === reasoning)?.label ?? 'Medium';
}

function ProviderLogo({
	provider,
	className,
}: {
	provider: ModelProvider;
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
	model: CatalogModel;
	isSelected: boolean;
	onSelect: (modelId: ChatModelId) => void;
}): React.JSX.Element {
	const { closeDropdown } = useDropdownContext();
	return (
		<button
			type="button"
			className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-foreground/[0.04]"
			onClick={() => {
				onSelect(model.canonical_id);
				closeDropdown();
			}}
		>
			<div className="flex min-w-0 flex-1 flex-col text-left">
				<span className="truncate text-foreground">{model.short_name}</span>
				<span className="truncate text-[11px] text-muted-foreground">
					{model.description}
				</span>
			</div>
			{isSelected ? (
				<CheckIcon aria-hidden="true" className="size-3.5 shrink-0 text-foreground" />
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
			className="flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-foreground/[0.04]"
			onClick={() => {
				onSelect(option.id);
				closeDropdown();
			}}
		>
			<span>{option.label}</span>
			{isSelected ? (
				<CheckIcon aria-hidden="true" className="size-3.5 text-foreground" />
			) : null}
		</button>
	);
}

/**
 * Renders the chat composer's model selector. Top-level rows group models by
 * provider — each provider opens a flyout submenu with its full model lineup
 * fetched from `GET /api/v1/models`.  The `Thinking` row at the bottom is a
 * peer submenu with the four reasoning levels and a descriptive secondary line,
 * mirroring the layout used by the Craft Agents reference design.
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
}: ModelSelectorPopoverProps): React.JSX.Element | null {
	const { data } = useModels();
	// Fall back to the bundled catalog while the query is pending or has
	// errored — the picker must remain usable on a cold load, especially
	// on Safari which can take a beat to settle the auth cookie before the
	// first `/api/v1/*` call returns.
	const catalog = data?.models ?? FALLBACK_CATALOG;
	const selectedModel = findModel(catalog, selectedModelId) ?? catalog[0];
	const reasoningLabel = getReasoningLabel(selectedReasoning);
	const { menuOpen, tooltipOpen, handleMenuOpenChange, handleTooltipOpenChange } =
		useTooltipDropdown();

	// Order provider rows by `PROVIDER_ORDER`, then hide any provider whose
	// catalog rows are empty (e.g. backend returned a Google-only catalog).
	const rootRows = useMemo<readonly RootRow[]>(() => {
		const providerRows: RootRow[] = PROVIDER_ORDER.filter((provider) =>
			catalog.some((model) => model.provider === provider)
		).map((provider) => ({ kind: 'provider', provider }));
		return [...providerRows, { kind: 'thinking' }];
	}, [catalog]);

	if (!selectedModel) {
		// `catalog` is never empty in practice — the fallback is non-empty
		// and the backend invariant requires at least one entry — but the
		// type system can't see that, so guard with a defensive return
		// rather than a non-null assertion.
		return null;
	}

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
							items={rootRows}
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
										{selectedModel.short_name}
									</span>
									<span>{reasoningLabel}</span>
									<ChevronDownIcon aria-hidden="true" className="size-3" />
								</Button>
							}
							renderItem={(row) => {
								if (row.kind === 'provider') {
									const models = catalog.filter(
										(model) => model.provider === row.provider
									);
									if (models.length === 0) return null;
									const isActiveProvider =
										selectedModel.provider === row.provider;
									return (
										<DropdownSubmenu>
											<DropdownSubmenuTrigger className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-foreground/[0.04]">
												<ProviderLogo provider={row.provider} />
												<span className="min-w-0 flex-1 truncate text-left">
													{PROVIDER_LABELS[row.provider]}
												</span>
												{isActiveProvider ? (
													<CheckIcon
														aria-hidden="true"
														className="size-3.5 shrink-0 text-foreground"
													/>
												) : (
													<ChevronRightIcon
														aria-hidden="true"
														className="size-3.5 shrink-0 text-muted-foreground"
													/>
												)}
											</DropdownSubmenuTrigger>
											<DropdownSubmenuContent className="chat-composer-dropdown-menu popover-styled p-1 min-w-64">
												{models.map((model) => (
													<ModelRow
														key={model.canonical_id}
														model={model}
														isSelected={
															selectedModel.canonical_id ===
															model.canonical_id
														}
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
