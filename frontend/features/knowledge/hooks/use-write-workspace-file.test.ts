import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryClientWrapper, createTestQueryClient } from '@/test/utils/render';
import { useWriteWorkspaceFile } from './use-write-workspace-file';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { fetcherMock } = vi.hoisted(() => ({ fetcherMock: vi.fn() }));

vi.mock('@/hooks/use-authed-fetch', () => ({
	useAuthedFetch: () => fetcherMock,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WORKSPACE_ID = 'ws-abc123';
const FILE_PATH = 'notes/readme.md';
const CONTENT = '# Hello\n\nThis is the new content.';

/** Minimal ok response that satisfies the hook's `res.json()` call. */
function makeOkResponse(body: object = { path: FILE_PATH, content: CONTENT }) {
	return {
		ok: true,
		status: 200,
		json: vi.fn().mockResolvedValue(body),
	};
}

/** Non-ok response with an optional detail message. */
function makeErrResponse(status: number, detail?: string) {
	return {
		ok: false,
		status,
		json: vi.fn().mockResolvedValue(detail ? { detail } : {}),
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useWriteWorkspaceFile', () => {
	beforeEach(() => {
		fetcherMock.mockReset();
	});

	it('calls PUT on the correct workspace file endpoint', async () => {
		fetcherMock.mockResolvedValue(makeOkResponse());
		const queryClient = createTestQueryClient();

		const { result } = renderHook(() => useWriteWorkspaceFile(WORKSPACE_ID), {
			wrapper: createQueryClientWrapper(queryClient),
		});

		result.current.mutate({ filePath: FILE_PATH, content: CONTENT });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(fetcherMock).toHaveBeenCalledWith(
			`/api/v1/workspaces/${WORKSPACE_ID}/files/${FILE_PATH}`,
			{
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content: CONTENT }),
			}
		);
	});

	it('returns the parsed JSON body on success', async () => {
		const responseBody = { path: FILE_PATH, content: CONTENT };
		fetcherMock.mockResolvedValue(makeOkResponse(responseBody));
		const queryClient = createTestQueryClient();

		const { result } = renderHook(() => useWriteWorkspaceFile(WORKSPACE_ID), {
			wrapper: createQueryClientWrapper(queryClient),
		});

		result.current.mutate({ filePath: FILE_PATH, content: CONTENT });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toEqual(responseBody);
	});

	it('invalidates the workspace-file query on success', async () => {
		fetcherMock.mockResolvedValue(makeOkResponse());
		const queryClient = createTestQueryClient();
		const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

		const { result } = renderHook(() => useWriteWorkspaceFile(WORKSPACE_ID), {
			wrapper: createQueryClientWrapper(queryClient),
		});

		result.current.mutate({ filePath: FILE_PATH, content: CONTENT });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: ['workspace-file', WORKSPACE_ID, FILE_PATH],
		});
	});

	it('throws with the server detail message on a non-ok response', async () => {
		fetcherMock.mockResolvedValue(makeErrResponse(422, 'File path is invalid'));
		const queryClient = createTestQueryClient();

		const { result } = renderHook(() => useWriteWorkspaceFile(WORKSPACE_ID), {
			wrapper: createQueryClientWrapper(queryClient),
		});

		result.current.mutate({ filePath: FILE_PATH, content: CONTENT });

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe('File path is invalid');
	});

	it('throws a generic HTTP message when the error body has no detail field', async () => {
		fetcherMock.mockResolvedValue(makeErrResponse(500));
		const queryClient = createTestQueryClient();

		const { result } = renderHook(() => useWriteWorkspaceFile(WORKSPACE_ID), {
			wrapper: createQueryClientWrapper(queryClient),
		});

		result.current.mutate({ filePath: FILE_PATH, content: CONTENT });

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toMatch(/HTTP 500/);
	});

	it('throws immediately when workspaceId is null', async () => {
		const queryClient = createTestQueryClient();

		const { result } = renderHook(() => useWriteWorkspaceFile(null), {
			wrapper: createQueryClientWrapper(queryClient),
		});

		result.current.mutate({ filePath: FILE_PATH, content: CONTENT });

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toMatch(/No workspace selected/);
		// Network call must never be made when there's no workspace.
		expect(fetcherMock).not.toHaveBeenCalled();
	});
});
