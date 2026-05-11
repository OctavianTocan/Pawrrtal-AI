/**
 * Pure presentational shell for the model + reasoning selector.
 *
 * @fileoverview Renders the dropdown trigger, the provider submenus, and the
 * reasoning submenu. No hooks — the container owns the tooltip-dropdown
 * coexistence guard.
 */

'use client';

import {
	DropdownMenu,
	DropdownSubmenu,
	DropdownSubmenuContent,
	DropdownSubmenuTrigger,
} from '@octavian-tocan/react-dropdown';
import { CheckIcon, ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import type { ChatModelOption, ChatReasoningLevel } from '../types/index.js';
import { Button } from '../ui/Button.js';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '../ui/Tooltip.js';
import { cn } from '../utils/cn.js';
import { ModelRow } from './ModelRow.js';
import {
	getModelsByProvider,
	providerLabel,
	type RootRow,
	rootRowDisplay,
	rootRowKey,
} from './model-selector-data.js';
import { ProviderLogo } from '../primitives/ProviderLogo.js';
import { ReasoningRow } from './ReasoningRow.js';

/** Props for the pure presentational shell of the model + reasoning selector. */
export interface ModelSelectorPopoverViewProps {
	/** Ordered root-menu rows (provider groups + optional thinking row). */
	rootRows: RootRow[];
	/** Consumer-supplied model list. */
	models?: ChatModelOption[];
	/** Currently-selected model option (already resolved by the container). */
	selectedModel?: ChatModelOption;
	/** Currently-selected model id. */
	selectedModelId?: string;
	/** Consumer-supplied reasoning levels. */
	reasoningLevels?: ChatReasoningLevel[];
	/** Currently-selected reasoning level. */
	selectedReasoning?: string;
	/** Display label for the selected reasoning level. */
	reasoningLabel: string;
	/** Whether the dropdown is currently open. */
	menuOpen: boolean;
	/** Whether the tooltip should be open (already accounts for `menuOpen`). */
	tooltipOpen: boolean;
	/** Fired when the user picks a model. */
	onSelectModel?: (modelId: string) => void;
	/** Fired when the user picks a reasoning level. */
	onSelectReasoning?: (level: ChatReasoningLevel) => void;
	/** Fired by Radix when the dropdown opens or closes. */
	onMenuOpenChange: (open: boolean) => void;
	/** Fired by Radix when the tooltip opens or closes. */
	onTooltipOpenChange: (open: boolean) => void;
}

/**
 * Renders the composer's model + reasoning picker.
 *
 * @returns The trigger button + the dropdown tree.
 */
export function ModelSelectorPopoverView({
	rootRows,
	models,
	selectedModel,
	selectedModelId,
	reasoningLevels,
	selectedReasoning,
	reasoningLabel,
	menuOpen,
	tooltipOpen,
	onSelectModel,
	onSelectReasoning,
	onMenuOpenChange,
	onTooltipOpenChange,
}: ModelSelectorPopoverViewProps): React.JSX.Element {
	const shortName = selectedModel?.shortName ?? selectedModelId ?? 'Model';
	return (
		<TooltipProvider disableHoverableContent>
			<Tooltip onOpenChange={onTooltipOpenChange} open={tooltipOpen}>
				<TooltipTrigger asChild>
					<span className="inline-flex">
						<DropdownMenu<RootRow>
							asChild
							usePortal
							placement="top"
							align="start"
							closeOnSelect={false}
							contentClassName="p-1 min-w-56 rounded-[var(--radius-chat-lg)] bg-[var(--color-chat-bg-elevated)] border border-[color:color-mix(in_oklch,var(--color-chat-border)_50%,transparent)] shadow-[var(--shadow-chat-minimal)]"
							getItemDisplay={rootRowDisplay}
							getItemKey={rootRowKey}
							getItemSeparator={(row) => row.kind === 'thinking'}
							items={rootRows}
							onOpenChange={onMenuOpenChange}
							onSelect={() => {
								/* submenu rows handle selection */
							}}
							trigger={
								<Button
									aria-label="Select model and reasoning"
									className={cn(
										'h-7 gap-1 rounded-[var(--radius-chat-sm)] border-0 bg-transparent px-2 text-[12px] font-normal text-[var(--color-chat-muted)] hover:bg-[color:color-mix(in_oklch,var(--color-chat-foreground)_10%,transparent)] hover:text-[var(--color-chat-foreground)]',
										menuOpen &&
											'bg-[color:color-mix(in_oklch,var(--color-chat-foreground)_8%,transparent)]',
									)}
									size="xs"
									type="button"
									variant="ghost"
								>
									<span className="text-[var(--color-chat-foreground)]">{shortName}</span>
									{reasoningLabel ? <span>{reasoningLabel}</span> : null}
									<ChevronDownIcon aria-hidden="true" className="size-3" />
								</Button>
							}
							renderItem={(row) => {
								if (row.kind === 'provider') {
									const providerModels = getModelsByProvider(models, row.provider);
									if (providerModels.length === 0) return null;
									const isActiveProvider = selectedModel?.provider === row.provider;
									return (
										<DropdownSubmenu>
											<DropdownSubmenuTrigger className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[color:color-mix(in_oklch,var(--color-chat-foreground)_4%,transparent)]">
												<ProviderLogo
													provider={row.provider}
													override={providerModels[0]?.logo}
												/>
												<span className="min-w-0 flex-1 truncate text-left">
													{providerLabel(row.provider)}
												</span>
												{isActiveProvider ? (
													<CheckIcon
														aria-hidden="true"
														className="size-3.5 shrink-0 text-[var(--color-chat-foreground)]"
													/>
												) : (
													<ChevronRightIcon
														aria-hidden="true"
														className="size-3.5 shrink-0 text-[var(--color-chat-muted)]"
													/>
												)}
											</DropdownSubmenuTrigger>
											<DropdownSubmenuContent className="p-1 min-w-64 rounded-[var(--radius-chat-lg)] bg-[var(--color-chat-bg-elevated)] border border-[color:color-mix(in_oklch,var(--color-chat-border)_50%,transparent)] shadow-[var(--shadow-chat-minimal)]">
												{providerModels.map((model) => (
													<ModelRow
														key={model.id}
														model={model}
														isSelected={selectedModelId === model.id}
														onSelect={onSelectModel ?? noopSelectModel}
													/>
												))}
											</DropdownSubmenuContent>
										</DropdownSubmenu>
									);
								}
								// 'thinking' row
								return (
									<DropdownSubmenu>
										<DropdownSubmenuTrigger className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[color:color-mix(in_oklch,var(--color-chat-foreground)_4%,transparent)]">
											<div className="flex min-w-0 flex-1 flex-col text-left">
												<span className="truncate text-[var(--color-chat-foreground)]">
													Thinking{reasoningLabel ? `: ${reasoningLabel}` : ''}
												</span>
												<span className="truncate text-[11px] text-[var(--color-chat-muted)]">
													Extended reasoning depth
												</span>
											</div>
										</DropdownSubmenuTrigger>
										<DropdownSubmenuContent className="p-1 min-w-32 rounded-[var(--radius-chat-lg)] bg-[var(--color-chat-bg-elevated)] border border-[color:color-mix(in_oklch,var(--color-chat-border)_50%,transparent)] shadow-[var(--shadow-chat-minimal)]">
											{(reasoningLevels ?? []).map((level) => (
												<ReasoningRow
													key={level}
													level={level}
													isSelected={selectedReasoning === level}
													onSelect={onSelectReasoning ?? noopSelectReasoning}
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

function noopSelectModel(_modelId: string): void {
	/* intentionally empty */
}
function noopSelectReasoning(_level: ChatReasoningLevel): void {
	/* intentionally empty */
}
