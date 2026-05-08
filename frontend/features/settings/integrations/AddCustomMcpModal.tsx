
import { AlertTriangle, X } from 'lucide-react';
import type * as React from 'react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResponsiveModal } from '@/components/ui/responsive-modal';

/** Props for {@link AddCustomMcpModal}. */
export interface AddCustomMcpModalProps {
	open: boolean;
	onDismiss: () => void;
	/** Fires when the user confirms a (non-empty) server URL. Visual-only today. */
	onContinue: (serverUrl: string) => void;
}

/**
 * "Add MCP Server" modal opened from the Add Integration modal's "+ Add
 * custom" button. Reads a server URL and surfaces the standard data /
 * trust warning.
 */
export function AddCustomMcpModal({
	open,
	onDismiss,
	onContinue,
}: AddCustomMcpModalProps): React.JSX.Element {
	const inputId = useId();
	const [serverUrl, setServerUrl] = useState('');

	const handleContinue = (): void => {
		if (!serverUrl.trim()) return;
		onContinue(serverUrl.trim());
	};

	return (
		<ResponsiveModal
			ariaLabel="Add MCP server"
			onDismiss={onDismiss}
			open={open}
			showDismissButton={false}
			size="sm"
			testId="add-custom-mcp-modal"
		>
			<div className="flex flex-col gap-4 p-5">
				<header className="flex items-center justify-between">
					<h2 className="text-base font-semibold text-foreground">Add MCP Server</h2>
					<button
						aria-label="Close"
						className="rounded-[6px] p-1.5 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
						onClick={onDismiss}
						type="button"
					>
						<X className="size-4" />
					</button>
				</header>

				<div className="flex flex-col gap-1.5">
					<label className="text-xs font-medium text-foreground" htmlFor={inputId}>
						Server URL
					</label>
					<Input
						autoFocus
						id={inputId}
						onChange={(event) => setServerUrl(event.target.value)}
						placeholder="https://mcp.example.com/mcp"
						value={serverUrl}
					/>
				</div>

				<div className="flex items-start gap-2 rounded-[8px] bg-foreground/[0.04] px-3 py-2 text-xs text-muted-foreground">
					<AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
					<p>
						Custom MCP servers can access your data and take actions on your behalf.
						Only add servers from sources you trust.
					</p>
				</div>

				<Button
					className="w-full"
					disabled={!serverUrl.trim()}
					onClick={handleContinue}
					type="button"
				>
					Continue
				</Button>
			</div>
		</ResponsiveModal>
	);
}
