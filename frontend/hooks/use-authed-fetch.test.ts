import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthedFetch } from './use-authed-fetch';

const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
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
