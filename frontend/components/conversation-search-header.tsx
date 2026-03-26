"use client";

import { Search, X } from "lucide-react";

interface ConversationSearchHeaderProps {
	searchQuery: string;
	onSearchChange: (query: string) => void;
	onSearchClose: () => void;
	resultCount: number;
}

export function ConversationSearchHeader({
	searchQuery,
	onSearchChange,
	onSearchClose,
	resultCount,
}: ConversationSearchHeaderProps) {
	const isSearchActive = searchQuery.trim().length >= 2;

	return (
		<div className="shrink-0 px-2 pt-2 pb-1.5 border-b border-border/50">
			<div className="relative rounded-[8px] shadow-minimal bg-muted/50 has-[:focus-visible]:bg-background">
				<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
				<input
					type="text"
					value={searchQuery}
					onChange={(event) => onSearchChange(event.target.value)}
					placeholder="Search titles and content..."
					className="w-full h-8 pl-8 pr-8 text-sm bg-transparent border-0 rounded-[8px] outline-none focus-visible:ring-0 focus-visible:outline-none placeholder:text-muted-foreground/50"
				/>
				{searchQuery ? (
					<button
						type="button"
						onClick={onSearchClose}
						className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-foreground/10 rounded cursor-pointer"
						title="Close search"
					>
						<X className="h-3.5 w-3.5 text-muted-foreground" />
					</button>
				) : null}
			</div>

			{isSearchActive ? (
				<div className="px-2 pt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
					<span>{resultCount} results</span>
				</div>
			) : null}
		</div>
	);
}
