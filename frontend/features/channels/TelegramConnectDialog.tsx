/**
 * Modal that walks a logged-in user through binding their Telegram
 * account to Nexus.
 *
 * The dialog has three rendering modes that map to {@link useTelegramBinding}'s
 * state:
 *
 * - **idle** — first paint or after `cancelConnect()`. Shows the call
 *   to action; primary button issues a code.
 * - **pending** — code issued, waiting for the bot to redeem it.
 *   Shows the code, a 10-minute countdown, the `t.me/<bot>?start=...`
 *   deep-link button, and a copy-to-clipboard control.
 * - **connected** — `useTelegramBinding` polled `/api/v1/channels` and
 *   saw the binding land. The dialog flips to a confirmation screen so
 *   the user gets unambiguous feedback before closing.
 *
 * BEAN: status push via SSE instead of the 2s poll once the core
 * gateway exposes a channel-status stream.
 *
 * @fileoverview Onboarding + settings dialog for the Telegram bind flow.
 */

'use client';

import { Check, Copy, ExternalLink } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/lib/toast';
import { useTelegramBinding } from './use-telegram-binding';

/** Props for {@link TelegramConnectDialog}. */
export interface TelegramConnectDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Called when the binding has just been confirmed (lets onboarding step advance). */
	onConnected?: () => void;
}

export function TelegramConnectDialog({
	open,
	onOpenChange,
	onConnected,
}: TelegramConnectDialogProps): React.JSX.Element {
	const state = useTelegramBinding();
	const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

	// Track the live countdown for the pending code. `expires_at` arrives
	// as an ISO string so we recompute every second from the current time
	// — cheaper and more accurate than decrementing a stored counter.
	useEffect(() => {
		if (state.pendingCode === null) {
			setSecondsLeft(null);
			return undefined;
		}
		const expiresAt = new Date(state.pendingCode.expires_at).getTime();
		const tick = (): void => {
			const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
			setSecondsLeft(remaining);
			if (remaining === 0) {
				state.cancelConnect();
			}
		};
		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	}, [state]);

	// Fire the onboarding callback exactly once per dialog session, the
	// first time we observe a binding while the dialog is open.
	const justConnected = state.binding !== null && state.pendingCode === null && open;
	useEffect(() => {
		if (justConnected && onConnected) {
			onConnected();
		}
	}, [justConnected, onConnected]);

	const countdownLabel = useMemo(() => {
		if (secondsLeft === null) {
			return null;
		}
		const minutes = Math.floor(secondsLeft / 60)
			.toString()
			.padStart(1, '0');
		const seconds = (secondsLeft % 60).toString().padStart(2, '0');
		return `${minutes}:${seconds}`;
	}, [secondsLeft]);

	const handleCopy = async (): Promise<void> => {
		if (!state.pendingCode) return;
		try {
			await navigator.clipboard.writeText(state.pendingCode.code);
			toast.success('Code copied');
		} catch {
			toast.error('Could not copy — long-press the code to select it.');
		}
	};

	const renderBody = (): React.JSX.Element => {
		if (state.notConfigured) {
			return (
				<div className="space-y-3 text-sm text-muted-foreground">
					<p>{state.error ?? 'Telegram is not configured on this deployment.'}</p>
					<p>
						Set <code>TELEGRAM_BOT_TOKEN</code> and <code>TELEGRAM_BOT_USERNAME</code> in
						<code> backend/.env</code>, restart the backend, and try again.
					</p>
				</div>
			);
		}

		if (state.binding !== null && state.pendingCode === null) {
			return (
				<div className="space-y-4">
					<div className="flex items-center gap-2 text-sm font-medium text-success">
						<Check aria-hidden="true" className="size-4" /> Connected as
						{state.binding.display_handle ? (
							<span className="font-semibold">@{state.binding.display_handle}</span>
						) : (
							<span className="font-semibold">your Telegram account</span>
						)}
					</div>
					<p className="text-sm text-muted-foreground">
						You can now message the bot directly and Nexus will respond from your
						account. Disconnect anytime from Settings → Channels.
					</p>
				</div>
			);
		}

		if (state.pendingCode !== null) {
			return (
				<div className="space-y-4">
					<p className="text-sm text-muted-foreground">
						Open Telegram, send the code below to{' '}
						<span className="font-medium text-foreground">
							@{state.pendingCode.bot_username ?? 'the Nexus bot'}
						</span>
						, and we'll connect this account.
					</p>
					<div className="flex items-center justify-between gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.04] px-4 py-3">
						<code className="font-mono text-2xl font-semibold tracking-[0.25em]">
							{state.pendingCode.code}
						</code>
						<Button
							onClick={() => void handleCopy()}
							size="sm"
							type="button"
							variant="outline"
						>
							<Copy aria-hidden="true" className="mr-1 size-3.5" /> Copy
						</Button>
					</div>
					<div className="flex items-center justify-between text-xs text-muted-foreground">
						<span>
							Code expires in{' '}
							<span className="font-mono text-foreground">{countdownLabel ?? '…'}</span>
						</span>
						<button
							className="cursor-pointer underline-offset-4 hover:underline"
							onClick={() => void state.startConnect()}
							type="button"
						>
							Generate a new code
						</button>
					</div>
					{state.pendingCode.deep_link && (
						<Button
							asChild
							className="w-full"
							size="lg"
							type="button"
							variant="default"
						>
							<a href={state.pendingCode.deep_link} rel="noreferrer" target="_blank">
								<ExternalLink aria-hidden="true" className="mr-2 size-4" />
								Open Telegram
							</a>
						</Button>
					)}
				</div>
			);
		}

		return (
			<div className="space-y-4 text-sm text-muted-foreground">
				<p>
					Get Nexus in your pocket: connect your Telegram account and chat with your
					assistant from anywhere.
				</p>
				<Button
					className="w-full"
					disabled={state.isBusy}
					onClick={() => void state.startConnect()}
					size="lg"
					type="button"
				>
					{state.isBusy ? 'Generating code…' : 'Generate connection code'}
				</Button>
				{state.error && <p className="text-destructive">{state.error}</p>}
			</div>
		);
	};

	return (
		<Dialog
			onOpenChange={(next) => {
				if (!next) {
					state.cancelConnect();
				}
				onOpenChange(next);
			}}
			open={open}
		>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Connect Telegram</DialogTitle>
				</DialogHeader>
				{renderBody()}
			</DialogContent>
		</Dialog>
	);
}
