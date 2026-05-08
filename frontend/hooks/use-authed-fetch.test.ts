import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthedFetch } from './use-authed-fetch';

const replaceMock = vi.fn();

// Pre-migration this mocked `next/navigation` (Next App Router); now
// the hook imports the same surface from `@/lib/navigation` (TanStack
// Router shim), so the mock target moved.  The default test setup at
// `frontend/test/setup.ts` also mocks `@/lib/navigation` with no-op
// fns; this per-test override replaces that with our spy so the test
// can assert on `replace('/login')`.
vi.mock('@/lib/navigation', () => ({
	useRouter: () => ({
		replace: replaceMock,
		push: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
		prefetch: vi.fn(),
	}),
	usePathname: () => '/',
	useSearchParams: () => new URLSearchParams(),
}));

describe('useAuthedFetch', (): void => {
	beforeEach((): void => {
		replaceMock.mockClear();
		vi.stubGlobal('fetch', vi.fn());
	});

	it('prefixes API URLs and includes credentials', async (): Promise<void> => {
		vi.mocked(fetch).mockResolvedValue(new Response('ok'));

		const { result } = renderHook(() => useAuthedFetch());

		await result.current('/api/v1/conversations', {
			method: 'GET',
		});

		expect(fetch).toHaveBeenCalledWith('http://localhost:8000/api/v1/conversations', {
			method: 'GET',
			credentials: 'include',
		});
	});

	it('redirects to login and throws on 401 responses', async (): Promise<void> => {
		vi.mocked(fetch).mockResolvedValue(new Response('nope', { status: 401 }));

		const { result } = renderHook(() => useAuthedFetch());

		await expect(result.current('/me')).rejects.toThrow('User is not authenticated');
		expect(replaceMock).toHaveBeenCalledWith('/login');
	});

	it('includes response bodies in non-auth API errors', async (): Promise<void> => {
		vi.mocked(fetch).mockResolvedValue(new Response('broken database', { status: 500 }));

		const { result } = renderHook(() => useAuthedFetch());

		await expect(result.current('/api/v1/conversations')).rejects.toThrow(
			'API Error: 500 . Body: broken database'
		);
	});
});
