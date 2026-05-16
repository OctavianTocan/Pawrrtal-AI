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
import { Button } from '@/features/_shared/ui/button';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/features/_shared/ui/tooltip';
import { usePointerDownCommit } from '@/hooks/use-pointer-down-commit';
import { useTooltipDropdown } from '@/hooks/use-tooltip-dropdown';
import { cn } from '@/lib/utils';
import type { ChatModelOption } from '../hooks/use-chat-models';
import { vendorLogo } from './VendorLogos';

/** Reasoning levels displayed next to the selected model. */
export const CHAT_REASONING_LEVELS = ['low', 'medium', 'high', 'extra-high'] as const;

/** Reasoning levels displayed next to the selected model. */
export type ChatReasoningLevel = (typeof CHAT_REASONING_LEVELS)[number];

type ReasoningOption = {
	/** Stable reasoning value. */
	id: ChatReasoningLevel;
	/** Human-facing label. */
	label: string;
};

const REASONING_OPTIONS: ReasoningOption[] = [
	{ id: 'low', label: 'Low' },
	{ id: 'medium', label: 'Medium' },
	{ id: 'high', label: 'High' },
	{ id: 'extra-high', label: 'Extra High' },
];

/** Title-case label rendered for a vendor row. */
function vendorLabel(vendor?: string): string {
	if (typeof vendor !== 'string' || vendor.length === 0) {
		return 'Unknown provider';
	}
	if (vendor === 'openai') return 'OpenAI';
	return vendor.charAt(0).toUpperCase() + vendor.slice(1);
}

/** Discriminated union of root-menu rows. */
type RootRow = { kind: 'vendor'; vendor: string } | { kind: 'thinking' };

/** Stable React key for each root row. */
function rootRowKey(row: RootRow): string {
	return row.kind === 'vendor' ? `vendor:${row.vendor}` : 'thinking';
}

/**
 * Props for the compact model and reasoning selector used in the chat composer.
 */
export interface ModelSelectorPopoverProps {
	/** Catalog entries from `useChatModels()` — the full set of selectable models. */
	models: readonly ChatModelOption[];
	/** Currently selected canonical model ID. */
	selectedModelId: string;
	/** Currently selected reasoning level. */
	selectedReasoning: ChatReasoningLevel;
	/** Callback fired when the user chooses a model. */
	onSelectModel: (modelId: string) => void;
	/** Callback fired when the user chooses a reasoning level. */
	onSelectReasoning: (reasoning: ChatReasoningLevel) => void;
	/** When `true`, the trigger renders a neutral placeholder while the catalog loads. */
	isLoading?: boolean;
	/** When `true`, the trigger renders a catalog failure state. */
	isError?: boolean;
}

/** Placeholder label rendered while the catalog is still in flight. */
const LOADING_MODEL_LABEL = 'Loading…';
const MODEL_ERROR_LABEL = 'Models unavailable';
const NO_MODELS_LABEL = 'No models';
const SELECT_MODEL_LABEL = 'Select model';

function findModel(models: readonly ChatModelOption[], modelId: string): ChatModelOption | null {
	return models.find((model) => model.id === modelId) ?? null;
}

function getReasoningLabel(reasoning: ChatReasoningLevel): string {
	return REASONING_OPTIONS.find((option) => option.id === reasoning)?.label ?? 'Medium';
}

function getTriggerLabel({
	isError,
	isLoading,
	modelCount,
	selectedModel,
}: {
	isError: boolean;
	isLoading: boolean;
	modelCount: number;
	selectedModel: ChatModelOption | null;
}): string {
	if (isLoading) return LOADING_MODEL_LABEL;
	if (isError) return MODEL_ERROR_LABEL;
	if (modelCount === 0) return NO_MODELS_LABEL;
	return selectedModel?.short_name ?? SELECT_MODEL_LABEL;
}

/** Models grouped by vendor, preserving the catalog's declaration order. */
function groupModelsByVendor(
	models: readonly ChatModelOption[]
): readonly { vendor: string; entries: readonly ChatModelOption[] }[] {
	// Preserve insertion order — the catalog already groups by vendor.
	const order: string[] = [];
	const buckets = new Map<string, ChatModelOption[]>();
	for (const model of models) {
		if (typeof model.vendor !== 'string' || model.vendor.length === 0) {
			continue;
		}
		const bucket = buckets.get(model.vendor);
		if (bucket) {
			bucket.push(model);
		} else {
			buckets.set(model.vendor, [model]);
			order.push(model.vendor);
		}
	}
	return order.map((vendor) => ({
		vendor,
		entries: buckets.get(vendor) ?? [],
	}));
}

/** Render-only wrapper that resolves the vendor logo from the canonical map. */
function VendorLogo({
	vendor,
	className,
}: {
	vendor: string;
	className?: string;
}): React.JSX.Element {
	const Logo = vendorLogo(vendor);
	return <Logo className={cn('size-3', className)} />;
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
	onSelect: (modelId: string) => void;
}): React.JSX.Element {
	const { closeDropdown } = useDropdownContext();
	const commitSelection = usePointerDownCommit<HTMLButtonElement>(() => {
		onSelect(model.id);
		closeDropdown();
	});

	return (
		<button
			type="button"
			className={cn(
				'flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-foreground/[0.04]',
				isSelected && 'bg-foreground/[0.07] font-medium'
			)}
			onClick={commitSelection.onClick}
			onPointerDown={commitSelection.onPointerDown}
		>
			<div className="flex min-w-0 flex-1 flex-col text-left">
				<span className="truncate text-foreground">{model.short_name}</span>
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
	const commitSelection = usePointerDownCommit<HTMLButtonElement>(() => {
		onSelect(option.id);
		closeDropdown();
	});

	return (
		<button
			type="button"
			className={cn(
				'flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-foreground/[0.04]',
				isSelected && 'bg-foreground/[0.07]'
			)}
			onClick={commitSelection.onClick}
			onPointerDown={commitSelection.onPointerDown}
		>
			<span>{option.label}</span>
		</button>
	);
}

/**
 * Renders the chat composer's model selector. Top-level rows group models by
 * vendor — each vendor opens a flyout submenu with its full model lineup.
 * The `Thinking` row at the bottom is a peer submenu with the four reasoning
 * levels and a descriptive secondary line, mirroring the layout used by the
 * Craft Agents reference design.
 *
 * Catalog data is supplied via the `models` prop — the source of truth is
 * the server-owned `GET /api/v1/models` endpoint surfaced through
 * `useChatModels()`. The picker is otherwise stateless.
 *
 * Built on `@octavian-tocan/react-dropdown` (the vendored package) to stay
 * consistent with `AutoReviewSelector` and `NavUser`. The package's
 * `DropdownSubmenu` family provides Radix-equivalent flyout submenus with
 * hover-open + ArrowRight-open keyboard semantics.
 */
export function ModelSelectorPopover({
	models,
	selectedModelId,
	selectedReasoning,
	onSelectModel,
	onSelectReasoning,
	isLoading = false,
	isError = false,
}: ModelSelectorPopoverProps): React.JSX.Element {
	const selectedModel = findModel(models, selectedModelId);
	const reasoningLabel = getReasoningLabel(selectedReasoning);
	const { menuOpen, tooltipOpen, handleMenuOpenChange, handleTooltipOpenChange } =
		useTooltipDropdown();
	const groupedVendors = groupModelsByVendor(models);

	// Discriminated union of every root-level row currently in the menu.
	const rootRows: RootRow[] = [
		...groupedVendors.map(
			(group) => ({ kind: 'vendor', vendor: group.vendor }) satisfies RootRow
		),
		{ kind: 'thinking' },
	];

	// Type-ahead display string for each root row — uses the live vendor list.
	function rootRowDisplay(row: RootRow): string {
		return row.kind === 'vendor' ? vendorLabel(row.vendor) : 'Thinking';
	}

	const triggerLabel = getTriggerLabel({
		isError,
		isLoading,
		modelCount: models.length,
		selectedModel,
	});

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
							// vendor section from the reasoning section.
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
									<span className="text-foreground">{triggerLabel}</span>
									<span>{reasoningLabel}</span>
									<ChevronDownIcon aria-hidden="true" className="size-3" />
								</Button>
							}
							renderItem={(row) => {
								if (row.kind === 'vendor') {
									const group = groupedVendors.find(
										(entry) => entry.vendor === row.vendor
									);
									if (!group || group.entries.length === 0) return null;
									const isActiveVendor = selectedModel?.vendor === row.vendor;
									return (
										<DropdownSubmenu>
											{/* `DropdownSubmenuTrigger` bakes in its own flyout
											    chevron — rendering an explicit ChevronRightIcon
											    here used to produce two arrows side-by-side. We
											    only emit the "active vendor" check now; the
											    library's chevron handles the "expand"
											    affordance for every row. */}
											<DropdownSubmenuTrigger
												className={cn(
													'flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-foreground/[0.04]',
													isActiveVendor && 'bg-foreground/[0.07]'
												)}
											>
												<VendorLogo vendor={row.vendor} />
												<span className="min-w-0 flex-1 truncate text-left">
													{vendorLabel(row.vendor)}
												</span>
											</DropdownSubmenuTrigger>
											<DropdownSubmenuContent className="chat-composer-dropdown-menu popover-styled p-1 min-w-64">
												{group.entries.map((model) => (
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
