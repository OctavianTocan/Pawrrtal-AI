'use client';

import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';

/*
 * This function returns a function that fetches a URL from the API.
 * If the user is not authenticated, it throws an error. (The caller can handle this by redirecting to the login page.)
 */
export function useAuthedFetch() {
  const router = useRouter();

  // Return a function that fetches a URL from the API.
  return async function authedFetch(endpoint: string | (() => string), options?: RequestInit) {
    // Construct the full URL to fetch from the API.
    const fetchUrl = `${API_BASE_URL}${typeof endpoint === 'function' ? endpoint() : endpoint}`;

    // Fetch the URL from the API.
    const response = await fetch(fetchUrl, {
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
  };
}
