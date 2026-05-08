/**
 * Stateful hook driving the Telegram connect dialog + the Settings row.
 *
 * Encapsulates the three states the binding flow can be in (idle,
 * pending a redemption, connected) and the periodic poll that flips
 * the UI to "connected" once the bot finishes redeeming the code.
 *
 * Polling is deliberately unsophisticated — every two seconds, hit
 * `/api/v1/channels`, look for a `telegram` row. The endpoint is cheap
 * and the dialog is only ever open while the user is actively waiting,
 * so there's no need to invent a websocket. BEAN: revisit once the
 * core exposes an SSE channel-status stream.
 *
 * @fileoverview React hook that wraps the channels API for the UI layer.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
	type ChannelBinding,
	ChannelNotConfiguredError,
	issueTelegramLinkCode,
	listChannels,
	type TelegramLinkCode,
	unlinkTelegram,
} from '@/lib/channels';

const POLL_INTERVAL_MS = 2000;
const PROVIDER = 'telegram';

/** Public shape returned by {@link useTelegramBinding}. */
export interface TelegramBindingState {
	/** Latest known binding row, or null when none. */
	binding: ChannelBinding | null;
	/** Active link code while the dialog is waiting on bot redemption. */
	pendingCode: TelegramLinkCode | null;
	/** Truthy while a network request is in flight. */
	isBusy: boolean;
	/** Last error message surfaced from the API, or null. */
	error: string | null;
	/** True iff the deployment intentionally has no bot configured. */
	notConfigured: boolean;
	/** Force a fresh `/api/v1/channels` fetch (e.g. on dialog open). */
	refresh: () => Promise<void>;
	/** Issue a new code and start polling for the bind to land. */
	startConnect: () => Promise<void>;
	/** Stop polling and forget the active code (e.g. dialog dismissed). */
	cancelConnect: () => void;
	/** Drop the binding server-side. */
	disconnect: () => Promise<void>;
}

/**
 * Hook that owns the Telegram binding state machine.
 *
 * Mounted at most twice per app — once in the onboarding step and once in
 * the Settings → Channels section — so it intentionally stays
 * un-cached. If we ever surface the same state in three+ places we'll
 * lift it into a context.
 */
export function useTelegramBinding(): TelegramBindingState {
	const [binding, setBinding] = useState<ChannelBinding | null>(null);
	const [pendingCode, setPendingCode] = useState<TelegramLinkCode | null>(null);
	const [isBusy, setIsBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [notConfigured, setNotConfigured] = useState(false);
	const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const stopPolling = useCallback(() => {
		if (pollTimerRef.current !== null) {
			clearInterval(pollTimerRef.current);
			pollTimerRef.current = null;
		}
	}, []);

	const refresh = useCallback(async () => {
		try {
			const rows = await listChannels();
			const next = rows.find((row) => row.provider === PROVIDER) ?? null;
			setBinding(next);
			if (next !== null) {
				// Bot finished the bind — close the polling loop and clear
				// the now-redundant code so the dialog snaps to "Connected".
				setPendingCode(null);
				stopPolling();
			}
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Unable to load channels.');
		}
	}, [stopPolling]);

	useEffect(() => {
		void refresh();
		return stopPolling;
	}, [refresh, stopPolling]);

	const startConnect = useCallback(async () => {
		setIsBusy(true);
		setError(null);
		try {
			const code = await issueTelegramLinkCode();
			setPendingCode(code);
			setNotConfigured(false);
			stopPolling();
			pollTimerRef.current = setInterval(() => {
				void refresh();
			}, POLL_INTERVAL_MS);
		} catch (cause) {
			if (cause instanceof ChannelNotConfiguredError) {
				setNotConfigured(true);
				setError(cause.message);
			} else {
				setError(cause instanceof Error ? cause.message : 'Failed to start connection.');
			}
		} finally {
			setIsBusy(false);
		}
	}, [refresh, stopPolling]);

	const cancelConnect = useCallback(() => {
		stopPolling();
		setPendingCode(null);
		setError(null);
	}, [stopPolling]);

	const disconnect = useCallback(async () => {
		setIsBusy(true);
		setError(null);
		try {
			await unlinkTelegram();
			setBinding(null);
			setPendingCode(null);
			stopPolling();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Failed to disconnect.');
		} finally {
			setIsBusy(false);
		}
	}, [stopPolling]);

	return {
		binding,
		pendingCode,
		isBusy,
		error,
		notConfigured,
		refresh,
		startConnect,
		cancelConnect,
		disconnect,
	};
}
