"use client";

import { useAtomValue } from "jotai";
import { ArrowUpIcon, ChevronDownIcon, SquareIcon } from "lucide-react";
import {
	type ChangeEvent,
	type ClipboardEvent,
	type DragEvent,
	type KeyboardEvent,
	useCallback,
	useRef,
	useState,
} from "react";
import {
	isStreamingAtom,
	type Model,
	modelsAtom,
	selectedModelIdAtom,
} from "@/atoms";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ChatInputProps {
	value: string;
	onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
	onSubmit: () => void;
	onModelChange?: (modelId: string) => void;
	onFilePaste?: (file: File) => void;
	disabled?: boolean;
	placeholder?: string;
	className?: string;
}

/** Group models by provider for the dropdown. */
function groupByProvider(models: Model[]): Record<string, Model[]> {
	const groups: Record<string, Model[]> = {};
	for (const model of models) {
		const key = model.provider || "other";
		if (!groups[key]) groups[key] = [];
		groups[key].push(model);
	}
	return groups;
}

/** Capitalize first letter of a provider name. */
function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Craft-styled chat input with auto-growing textarea, submit button,
 * and model selector dropdown.
 *
 * This is a controlled component -- value/onChange are owned by the parent.
 * Submit logic lives in ChatContainer; this component calls onSubmit.
 */
export function ChatInput({
	value,
	onChange,
	onSubmit,
	onModelChange,
	onFilePaste,
	disabled = false,
	placeholder = "Ask anything...",
	className,
}: ChatInputProps) {
	const isStreaming = useAtomValue(isStreamingAtom);
	const models = useAtomValue(modelsAtom);
	const selectedModelId = useAtomValue(selectedModelIdAtom);

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [modelMenuOpen, setModelMenuOpen] = useState(false);

	const canSubmit = value.trim().length > 0 && !disabled;

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				if (canSubmit) {
					onSubmit();
				}
			}
		},
		[canSubmit, onSubmit],
	);

	const handlePaste = useCallback(
		(e: ClipboardEvent<HTMLTextAreaElement>) => {
			if (!onFilePaste) return;
			const items = e.clipboardData?.items;
			if (!items) return;
			for (const item of items) {
				if (item.type.startsWith("image/")) {
					const file = item.getAsFile();
					if (file) {
						e.preventDefault();
						onFilePaste(file);
						return;
					}
				}
			}
		},
		[onFilePaste],
	);

	const handleDrop = useCallback(
		(e: DragEvent<HTMLTextAreaElement>) => {
			if (!onFilePaste) return;
			const files = e.dataTransfer?.files;
			if (!files?.length) return;
			for (const file of files) {
				if (file.type.startsWith("image/")) {
					e.preventDefault();
					onFilePaste(file);
					return;
				}
			}
		},
		[onFilePaste],
	);

	const handleSubmitClick = useCallback(() => {
		if (canSubmit) {
			onSubmit();
		}
	}, [canSubmit, onSubmit]);

	const selectedModel = models.find((m) => m.id === selectedModelId);
	const grouped = groupByProvider(models);

	return (
		<div
			className={cn(
				"relative rounded-2xl border border-border/60 bg-muted/30",
				"transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20",
				className,
			)}
		>
			{/* Textarea */}
			<textarea
				ref={textareaRef}
				value={value}
				onChange={onChange}
				onKeyDown={handleKeyDown}
				onPaste={handlePaste}
				onDrop={handleDrop}
				placeholder={placeholder}
				disabled={disabled}
				rows={1}
				className={cn(
					"w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm",
					"placeholder:text-muted-foreground/60 focus:outline-none",
					"min-h-[44px] max-h-[200px]",
					"field-sizing-content",
				)}
			/>

			{/* Footer: model selector + submit button */}
			<div className="flex items-center justify-between px-3 pb-2">
				{/* Model selector */}
				<DropdownMenu open={modelMenuOpen} onOpenChange={setModelMenuOpen}>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
						>
							{selectedModel ? (
								<>
									{/* biome-ignore lint/performance/noImgElement: external SVG logos from models.dev CDN */}
									<img
										src={`https://models.dev/logos/${selectedModel.provider}.svg`}
										alt={selectedModel.provider}
										className="size-3 dark:invert"
										width={12}
										height={12}
									/>
									{selectedModel.name}
								</>
							) : (
								selectedModelId || "Select model"
							)}
							<ChevronDownIcon className="size-3 opacity-50" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="start"
						className="max-h-80 overflow-y-auto min-w-56"
					>
						{Object.entries(grouped).map(([provider, providerModels]) => (
							<div key={provider}>
								<div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
									{capitalize(provider)}
								</div>
								{providerModels.map((model) => (
									<DropdownMenuItem
										key={model.id}
										onSelect={() => {
											onModelChange?.(model.id);
											setModelMenuOpen(false);
										}}
										className="gap-2"
									>
										{/* biome-ignore lint/performance/noImgElement: external SVG logos from models.dev CDN */}
										<img
											src={`https://models.dev/logos/${model.provider}.svg`}
											alt={model.provider}
											className="size-3 dark:invert"
											width={12}
											height={12}
										/>
										<span className="flex-1 truncate">{model.name}</span>
										{model.id === selectedModelId && (
											<span className="text-xs text-muted-foreground">*</span>
										)}
									</DropdownMenuItem>
								))}
							</div>
						))}
						{models.length === 0 && (
							<div className="px-2 py-3 text-center text-xs text-muted-foreground">
								No models available
							</div>
						)}
					</DropdownMenuContent>
				</DropdownMenu>

				{/* Submit button */}
				<Button
					type="button"
					size="icon"
					variant={canSubmit ? "default" : "ghost"}
					className={cn(
						"size-7 shrink-0 rounded-lg transition-colors",
						!canSubmit && "text-muted-foreground",
					)}
					disabled={!canSubmit && !isStreaming}
					onClick={handleSubmitClick}
				>
					{isStreaming ? (
						<SquareIcon className="size-3.5 fill-current" />
					) : (
						<ArrowUpIcon className="size-3.5" />
					)}
				</Button>
			</div>
		</div>
	);
}
