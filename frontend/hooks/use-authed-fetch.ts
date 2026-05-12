'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { apiFetch } from '@/lib/api';

/**
 * Returns a memoized `fetch` wrapper that targets the configured backend URL,
 * sends cookies, adds the `X-Pawrrtal-Key` header when configured, and handles auth failures.
 *
 * - Uses {@link apiFetch} so the backend API key header is included automatically.
 * - Sends `credentials: 'include'` so the HTTP-only session cookie reaches the API.
 * - On `401`, replaces the route with `/login` and throws (callers should treat this as a hard logout signal).
 * - On other non-OK responses, throws with status and body text for debugging.
 *
 * @returns Async function `(endpoint, options?) => Response` where `endpoint` is a path string or lazy path factory.
 */
export function useAuthedFetch() {
	const router = useRouter();

	// Return a stable function identity between renders so effects depending on it do not loop.
	return useCallback(
		async function authedFetch(endpoint: string | (() => string), options?: RequestInit) {
			const path = typeof endpoint === 'function' ? endpoint() : endpoint;

			// apiFetch prepends the backend URL and injects X-Pawrrtal-Key when configured.
			const response = await apiFetch(path, {
				...options,
				// Include the session token in the request. (HTTPOnly Cookie)
				credentials: 'include',
			});

			// Handle expired cookies. (User is not authenticated.)
			if (response.status === 401) {
				router.replace('/login');
				throw new Error('User is not authenticated');
			}

			// Handle other errors.
			if (!response.ok) {
				throw new Error(
					`API Error: ${response.status} ${response.statusText}. Body: ${await response.text()}`
				);
			}

			// Return the user.
			return response;
		},
		[router]
	);
}
