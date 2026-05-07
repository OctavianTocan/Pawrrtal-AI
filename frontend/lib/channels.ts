/**
 * Frontend client for the /api/v1/channels backend routes.
 *
 * Tiny on purpose — the screens that consume it (the onboarding
 * "Connect Telegram" step + the Settings → Channels section) own their
 * own loading / error UX, so the helpers here just shape the request
 * and parse the response. All calls go through `credentials: 'include'`
 * so the FastAPI-Users session cookie rides along on cross-origin
 * dev (frontend on :3001, backend on :8000).
 *
 * @fileoverview Typed helpers for the channel binding flow.
 */

import { API_BASE_URL, API_ENDPOINTS } from '@/lib/api';

/** Public shape returned by `GET /api/v1/channels`. */
export interface ChannelBinding {
	provider: string;
	external_user_id: string;
	external_chat_id: string | null;
	display_handle: string | null;
	created_at: string;
}

/** Response shape from `POST /api/v1/channels/telegram/link`. */
export interface TelegramLinkCode {
	code: string;
	expires_at: string;
	bot_username: string | null;
	deep_link: string | null;
}

/** Thrown when the backend signals Telegram is intentionally not configured. */
export class ChannelNotConfiguredError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ChannelNotConfiguredError';
	}
}

/** List the authenticated user's channel bindings. */
export async function listChannels(signal?: AbortSignal): Promise<ChannelBinding[]> {
	const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.channels.list}`, {
		credentials: 'include',
		signal,
	});
	if (!response.ok) {
		throw new Error(`Failed to list channels (${response.status})`);
	}
	return (await response.json()) as ChannelBinding[];
}

/** Issue a fresh one-time Telegram link code for the authenticated user. */
export async function issueTelegramLinkCode(signal?: AbortSignal): Promise<TelegramLinkCode> {
	const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.channels.telegramLink}`, {
		method: 'POST',
		credentials: 'include',
		signal,
	});
	if (response.status === 503) {
		const detail = (await response.json().catch(() => ({}))) as { detail?: string };
		throw new ChannelNotConfiguredError(
			detail.detail ?? 'Telegram channel is not configured on this deployment.'
		);
	}
	if (!response.ok) {
		throw new Error(`Failed to issue Telegram link code (${response.status})`);
	}
	return (await response.json()) as TelegramLinkCode;
}

/** Drop the authenticated user's Telegram binding. Idempotent. */
export async function unlinkTelegram(signal?: AbortSignal): Promise<void> {
	const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.channels.telegramUnlink}`, {
		method: 'DELETE',
		credentials: 'include',
		signal,
	});
	if (!response.ok && response.status !== 204) {
		throw new Error(`Failed to disconnect Telegram (${response.status})`);
	}
}
