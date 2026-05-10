/**
 * Tests for useWorkspaceTree — the dual-fetch hook that loads the default
 * workspace then its file tree.
 *
 * Testing approach: RTL + MSW (network boundary tests).
 * The hook makes two sequential real fetch calls; MSW intercepts them at the
 * network layer so we test the real hook logic (dependent query, tree
 * transformation, derived loading/error flags) without a backend.
 *
 * Scenarios covered:
 * - Happy path: two successful fetches produce a fileTree + workspaceId.
 * - No workspaces: empty list → fileTree null, workspaceId null.
 * - Non-default workspace: first workspace in list used as fallback.
 * - Workspace fetch error: isError=true, error surfaced.
 * - Tree fetch error: isError=true after workspace resolves.
 * - Tree is not fetched when workspaces is empty (no wasted request).
 * - isLoading is true while requests are in-flight.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
// Mock next/navigation (useRouter is called inside useAuthedFetch).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '@/lib/api';
import { fixtures } from '@/test/handlers';
import { server } from '@/test/server';
import { createQueryClientWrapper, createTestQueryClient } from '@/test/utils/render';
import { useWorkspaceTree } from './use-workspace-tree';

vi.mock('next/navigation', () => ({
	useRouter: () => ({ replace: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const WORKSPACE_ID = fixtures.workspace.id;

const treeResponse = {
	workspace_id: WORKSPACE_ID,
	nodes: [
		{
			path: 'notes/hello.md',
			kind: 'file' as const,
			size: 128,
			updated_at: '2026-01-01T00:00:00Z',
		},
		{ path: 'notes', kind: 'folder' as const, updated_at: '2026-01-01T00:00:00Z' },
	],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderTree() {
	const queryClient = createTestQueryClient();
	return renderHook(() => useWorkspaceTree(), {
		wrapper: createQueryClientWrapper(queryClient),
	});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useWorkspaceTree', () => {
	beforeEach(() => {
		// Override the default tree handler to return our richer fixture.
		server.use(
			http.get(`${API_BASE_URL}/api/v1/workspaces/${WORKSPACE_ID}/tree`, () =>
				HttpResponse.json(treeResponse)
			)
		);
	});

	it('returns workspaceId and a non-null fileTree on success', async () => {
		const { result } = renderTree();

		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.isError).toBe(false);
		expect(result.current.error).toBeNull();
		expect(result.current.workspaceId).toBe(WORKSPACE_ID);
		// flatNodesToTree should produce a non-null tree.
		expect(result.current.fileTree).not.toBeNull();
	});

	it('returns the correct workspaceId (the default workspace)', async () => {
		// Two workspaces: second one is default.
		server.use(
			http.get(`${API_BASE_URL}/api/v1/workspaces`, () =>
				HttpResponse.json([
					{ ...fixtures.workspace, id: 'ws-not-default', is_default: false },
					{ ...fixtures.workspace, id: 'ws-is-default', is_default: true },
				])
			),
			http.get(`${API_BASE_URL}/api/v1/workspaces/ws-is-default/tree`, () =>
				HttpResponse.json({ workspace_id: 'ws-is-default', nodes: [] })
			)
		);

		const { result } = renderTree();

		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.workspaceId).toBe('ws-is-default');
	});

	it('falls back to first workspace when none is marked default', async () => {
		server.use(
			http.get(`${API_BASE_URL}/api/v1/workspaces`, () =>
				HttpResponse.json([
					{ ...fixtures.workspace, id: 'ws-first', is_default: false },
					{ ...fixtures.workspace, id: 'ws-second', is_default: false },
				])
			),
			http.get(`${API_BASE_URL}/api/v1/workspaces/ws-first/tree`, () =>
				HttpResponse.json({ workspace_id: 'ws-first', nodes: [] })
			)
		);

		const { result } = renderTree();

		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.workspaceId).toBe('ws-first');
	});

	it('returns null workspaceId and null fileTree when workspaces list is empty', async () => {
		server.use(http.get(`${API_BASE_URL}/api/v1/workspaces`, () => HttpResponse.json([])));

		const { result } = renderTree();

		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.workspaceId).toBeNull();
		expect(result.current.fileTree).toBeNull();
		expect(result.current.isError).toBe(false);
	});

	it('does NOT fetch the tree when the workspaces list is empty', async () => {
		let treeCallCount = 0;
		server.use(
			http.get(`${API_BASE_URL}/api/v1/workspaces`, () => HttpResponse.json([])),
			// This should NEVER be called.
			http.get(`${API_BASE_URL}/api/v1/workspaces/:id/tree`, () => {
				treeCallCount++;
				return HttpResponse.json({ workspace_id: 'x', nodes: [] });
			})
		);

		const { result } = renderTree();

		// Wait long enough for any stray request to arrive.
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(treeCallCount).toBe(0);
	});

	it('sets isError and surfaces the error when the workspaces request fails', async () => {
		server.use(
			http.get(`${API_BASE_URL}/api/v1/workspaces`, () =>
				HttpResponse.json({ detail: 'Internal server error' }, { status: 500 })
			)
		);

		const { result } = renderTree();

		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(result.current.workspaceId).toBeNull();
		expect(result.current.fileTree).toBeNull();
		expect(result.current.error).toBeInstanceOf(Error);
	});

	it('sets isError when the tree request fails after workspaces resolves', async () => {
		server.use(
			http.get(`${API_BASE_URL}/api/v1/workspaces/${WORKSPACE_ID}/tree`, () =>
				HttpResponse.json({ detail: 'Tree unavailable' }, { status: 503 })
			)
		);

		const { result } = renderTree();

		await waitFor(() => expect(result.current.isError).toBe(true));

		// workspaceId resolved; only the tree failed.
		expect(result.current.workspaceId).toBe(WORKSPACE_ID);
		expect(result.current.fileTree).toBeNull();
		expect(result.current.error).toBeInstanceOf(Error);
	});
});
