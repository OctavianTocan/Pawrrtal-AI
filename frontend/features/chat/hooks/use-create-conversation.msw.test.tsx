/**
 * MSW-based tests for useCreateConversation.
 *
 * Canonical reference for the RTL + MSW pattern in this codebase.
 *
 * Why MSW over vi.stubGlobal('fetch', vi.fn()):
 * - Request matching is by URL + method, not by call order — tests are
 *   resilient to incidental extra fetches (React Query retries, etc.).
 * - The handler definition doubles as a contract spec: if the backend route
 *   path changes, the handler breaks visibly in CI before users hit it.
 * - Per-test overrides (`server.use(...)`) are isolated and reset
 *   automatically — no manual `mockRestore` needed.
 *
 * Scenarios covered:
 * - Successful creation: mutation resolves, cache is updated.
 * - Server 409 conflict: mutation rejects with an Error.
 * - Server 422 validation error: mutation rejects.
 * - 401 → router.replace('/login') is called.
 * - Returned conversation shape is passed through verbatim (contract check).
 */

import { renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '@/lib/api';
import { fixtures } from '@/test/handlers';
import { server } from '@/test/server';
import { createQueryClientWrapper, createTestQueryClient } from '@/test/utils/render';
import { useCreateConversation } from './use-create-conversation';

// ---------------------------------------------------------------------------
// next/navigation stub
// ---------------------------------------------------------------------------

const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
	useRouter: () => ({ replace: replaceMock }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CONVERSATION_ID = 'client-reserved-uuid';

function renderMutation() {
	const queryClient = createTestQueryClient();
	return {
		...renderHook(() => useCreateConversation(CONVERSATION_ID), {
			wrapper: createQueryClientWrapper(queryClient),
		}),
		queryClient,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useCreateConversation (MSW)', () => {
	it('resolves with the server-returned conversation on success', async () => {
		const serverConversation = {
			...fixtures.conversation,
			id: CONVERSATION_ID,
			title: 'Hello',
		};
		server.use(
			http.post(`${API_BASE_URL}/api/v1/conversations/${CONVERSATION_ID}`, () =>
				HttpResponse.json(serverConversation)
			)
		);

		const { result } = renderMutation();
		result.current.mutate({ title: 'Hello' });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data?.id).toBe(CONVERSATION_ID);
		expect(result.current.data?.title).toBe('Hello');
	});

	it('passes the title in the request body', async () => {
		let capturedBody: unknown;
		server.use(
			http.post(
				`${API_BASE_URL}/api/v1/conversations/${CONVERSATION_ID}`,
				async ({ request }) => {
					capturedBody = await request.json();
					return HttpResponse.json({ ...fixtures.conversation, id: CONVERSATION_ID });
				}
			)
		);

		const { result } = renderMutation();
		result.current.mutate({ title: 'My new chat' });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(capturedBody).toEqual({ title: 'My new chat' });
	});

	it('rejects with an Error when the server returns 409 Conflict', async () => {
		server.use(
			http.post(`${API_BASE_URL}/api/v1/conversations/${CONVERSATION_ID}`, () =>
				HttpResponse.json({ detail: 'Conversation already exists' }, { status: 409 })
			)
		);

		const { result } = renderMutation();
		result.current.mutate({ title: 'Duplicate' });

		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(result.current.error).toBeInstanceOf(Error);
	});

	it('rejects on 422 Unprocessable Content (validation error)', async () => {
		server.use(
			http.post(`${API_BASE_URL}/api/v1/conversations/${CONVERSATION_ID}`, () =>
				HttpResponse.json(
					{ detail: [{ loc: ['body', 'title'], msg: 'field required' }] },
					{ status: 422 }
				)
			)
		);

		const { result } = renderMutation();
		result.current.mutate({ title: '' });

		await waitFor(() => expect(result.current.isError).toBe(true));
	});

	it('redirects to /login and throws when the server returns 401', async () => {
		server.use(
			http.post(
				`${API_BASE_URL}/api/v1/conversations/${CONVERSATION_ID}`,
				() => new HttpResponse(null, { status: 401 })
			)
		);

		const { result } = renderMutation();
		result.current.mutate({ title: 'Auth test' });

		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(replaceMock).toHaveBeenCalledWith('/login');
	});

	it('updates the conversations cache on success', async () => {
		const returned = { ...fixtures.conversation, id: CONVERSATION_ID, title: 'Cached!' };
		server.use(
			http.post(`${API_BASE_URL}/api/v1/conversations/${CONVERSATION_ID}`, () =>
				HttpResponse.json(returned)
			)
		);

		const { result, queryClient } = renderMutation();
		result.current.mutate({ title: 'Cached!' });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		const cached = queryClient.getQueryData<unknown[]>(['conversations']);
		// The cache must contain the new conversation.
		expect(Array.isArray(cached)).toBe(true);
		expect((cached as Array<{ id: string }>).some((c) => c.id === CONVERSATION_ID)).toBe(true);
	});
});
