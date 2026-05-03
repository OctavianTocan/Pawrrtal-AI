interface SectionHeaderProps {
	/** The section label text (e.g. "Today", "Yesterday"). */
	label: string;
}

/**
 * A non-interactive section label used when a conversation date group
 * is the only group visible (i.e. collapsing is disabled).
 */
export function SectionHeader({ label }: SectionHeaderProps): React.JSX.Element {
	return (
		<li className="px-4 py-2">
			<span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
				{label}
			</span>
		</li>
	);
}
