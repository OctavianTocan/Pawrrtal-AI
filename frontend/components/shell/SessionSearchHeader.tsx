"use client";

import { IconSearch, IconX } from "@tabler/icons-react";
import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

interface SessionSearchHeaderProps {
	value: string;
	onChange: (value: string) => void;
	className?: string;
}

export function SessionSearchHeader({
	value,
	onChange,
	className,
}: SessionSearchHeaderProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	const handleClear = useCallback(() => {
		onChange("");
		inputRef.current?.focus();
	}, [onChange]);

	return (
		<div className={cn("relative px-2 py-1.5", className)}>
			<div className="relative flex items-center">
				<IconSearch className="absolute left-2 h-3.5 w-3.5 text-foreground/40 pointer-events-none" />
				<input
					ref={inputRef}
					type="text"
					placeholder="Search conversations..."
					value={value}
					onChange={(e) => onChange(e.target.value)}
					className={cn(
						"w-full rounded-md bg-foreground/5 py-[5px] pl-7 pr-7",
						"text-[13px] text-foreground placeholder:text-foreground/40",
						"outline-none transition-colors",
						"focus:bg-foreground/[0.07]",
					)}
				/>
				{value && (
					<button
						type="button"
						onClick={handleClear}
						className="absolute right-1.5 flex items-center justify-center rounded p-0.5 text-foreground/40 hover:text-foreground/70 transition-colors"
					>
						<IconX className="h-3 w-3" />
					</button>
				)}
			</div>
		</div>
	);
}
