/**
 * Tests for the live AppearanceSection.
 *
 * The component reads `useAppearance` (TanStack Query) and dispatches
 * `useUpdateAppearance` / `useResetAppearance`. These hooks both call
 * `useAuthedFetch` from `@/hooks/use-authed-fetch`, which we mock so
 * the test never hits the network — it just asserts the rendered
 * shape and that toggling theme mode triggers a mutation against the
 * `/api/v1/appearance` endpoint.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAuthedFetch } = vi.hoisted(() => ({
	mockAuthedFetch: vi.fn(),
}));

vi.mock('@/hooks/use-authed-fetch', () => ({
	useAuthedFetch: () => mockAuthedFetch,
}));

// Imported AFTER `vi.mock` so the test sees the mocked module.
import { AppearanceSection } from './AppearanceSection';

/** Build an isolated QueryClient per test so cache state never leaks. */
function createWrapper(): React.FC<{ children: React.ReactNode }> {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** Stub the fetch wrapper to return a `Response`-like object with the given JSON. */
function mockResponse(payload: unknown): void {
	mockAuthedFetch.mockResolvedValueOnce({
		ok: true,
		status: 200,
		json: async () => payload,
		text: async () => JSON.stringify(payload),
	});
}

const EMPTY_SETTINGS = {
	light: {},
	dark: {},
	fonts: {},
	options: {},
};

describe('AppearanceSection', () => {
	beforeEach(() => {
		mockAuthedFetch.mockReset();
	});

	afterEach(() => {
		mockAuthedFetch.mockReset();
	});

	it('renders the Theme + Light + Dark theme cards', async () => {
		mockResponse(EMPTY_SETTINGS);
		const Wrapper = createWrapper();
		render(<AppearanceSection />, { wrapper: Wrapper });

		await waitFor(() => {
			expect(screen.getByText('Theme')).toBeTruthy();
		});
		expect(screen.getByText('Light theme')).toBeTruthy();
		expect(screen.getByText('Dark theme')).toBeTruthy();
	});

	it('renders all three theme mode toggles', async () => {
		mockResponse(EMPTY_SETTINGS);
		const Wrapper = createWrapper();
		render(<AppearanceSection />, { wrapper: Wrapper });

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /Light/ })).toBeTruthy();
		});
		expect(screen.getByRole('button', { name: /Dark/ })).toBeTruthy();
		expect(screen.getByRole('button', { name: /System/ })).toBeTruthy();
	});

	it('dispatches a PUT mutation when a different theme mode is selected', async () => {
		mockResponse(EMPTY_SETTINGS);
		const Wrapper = createWrapper();
		render(<AppearanceSection />, { wrapper: Wrapper });

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /Dark/ })).toBeTruthy();
		});

		mockResponse(EMPTY_SETTINGS);
		fireEvent.click(screen.getByRole('button', { name: /Dark/ }));

		await waitFor(() => {
			expect(mockAuthedFetch).toHaveBeenCalledWith(
				'/api/v1/appearance',
				expect.objectContaining({ method: 'PUT' })
			);
		});

		// Find the PUT call specifically — the mutation's invalidate-on-
		// settle triggers a follow-up GET that lands at `mock.calls.at(-1)`.
		const putCall = mockAuthedFetch.mock.calls.find(
			(call) => (call[1] as RequestInit | undefined)?.method === 'PUT'
		);
		expect(putCall).toBeDefined();
		expect(putCall?.[0]).toBe('/api/v1/appearance');
		const body = (putCall?.[1] as RequestInit | undefined)?.body as string | undefined;
		expect(body).toBeDefined();
		const parsed = JSON.parse(body ?? '{}') as { options: { theme_mode: string } };
		expect(parsed.options.theme_mode).toBe('dark');
	});

	it('renders the Behavior + Typography cards with default values', async () => {
		mockResponse(EMPTY_SETTINGS);
		const Wrapper = createWrapper();
		render(<AppearanceSection />, { wrapper: Wrapper });

		await waitFor(() => {
			expect(screen.getByText('Use pointer cursors')).toBeTruthy();
		});
		expect(screen.getByText('UI font size')).toBeTruthy();
		// Default UI font size is the Mistral default of 16px.
		expect(screen.getByDisplayValue('16')).toBeTruthy();
	});

	it('exposes a per-mode preset picker that PUTs an empty colors payload on reset', async () => {
		mockResponse(EMPTY_SETTINGS);
		const Wrapper = createWrapper();
		render(<AppearanceSection />, { wrapper: Wrapper });

		// Two preset selects (one per theme card). Wait for them to mount.
		await waitFor(() => {
			expect(screen.getAllByRole('combobox', { name: /preset/ }).length).toBe(2);
		});

		mockResponse(EMPTY_SETTINGS);
		const lightSelect = screen.getAllByRole('combobox', { name: /preset/ })[0];
		expect(lightSelect).toBeDefined();
		fireEvent.change(lightSelect as HTMLSelectElement, {
			target: { value: '__reset__' },
		});

		await waitFor(() => {
			const putCall = mockAuthedFetch.mock.calls.find(
				(call) => (call[1] as RequestInit | undefined)?.method === 'PUT'
			);
			expect(putCall).toBeDefined();
		});

		const putCall = mockAuthedFetch.mock.calls.find(
			(call) => (call[1] as RequestInit | undefined)?.method === 'PUT'
		);
		const body = (putCall?.[1] as RequestInit | undefined)?.body as string | undefined;
		expect(body).toBeDefined();
		const parsed = JSON.parse(body ?? '{}') as { light: Record<string, unknown> };
		// Reset clears the light mode's overrides (light should be {}).
		expect(parsed.light).toEqual({});
	});
});
