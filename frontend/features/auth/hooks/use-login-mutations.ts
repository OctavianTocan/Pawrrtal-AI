import { useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/api';

/** Same-origin proxy so Safari stores session cookies from dev-login (see `app/api/auth/dev-login`). */
const DEV_LOGIN_PROXY_PATH = '/api/auth/dev-login';

/** Arguments for a standard email/password login request. */
export interface LoginArgs {
  email: string;
  password: string;
}

/** Error structure from FastAPI. */
interface FastAPIError {
  detail: string | Array<unknown>;
}

/** Helper to parse standard FastAPI error responses or throw generic fallbacks. */
async function handleResponseError(response: Response, defaultMessage: string): Promise<never> {
  let message = defaultMessage;
  try {
    const errorBody = (await response.json()) as FastAPIError;
    if (typeof errorBody?.detail === 'string') {
      message = errorBody.detail;
    } else if (Array.isArray(errorBody?.detail)) {
      message = 'Invalid request payload.';
    }
  } catch {
    // If JSON parsing fails, we keep the default message.
  }
  throw new Error(message);
}

/**
 * Hook to authenticate via standard email/password form data.
 */
export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, LoginArgs>({
    mutationFn: async ({ email, password }) => {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.login}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ username: email, password }),
        credentials: 'include',
      });

      if (!response.ok) {
        await handleResponseError(response, 'Unable to log in with those credentials.');
      }
    },
    onSuccess: () => {
      // Invalidate any queries that depend on auth state (e.g. user profile).
      void queryClient.invalidateQueries();
    },
  });
}

/**
 * Dev admin login shortcut.
 *
 * Calls **`POST /api/auth/dev-login`** (same origin as the Next app), not the FastAPI URL directly.
 *
 * **Why:** The UI is on **`app.*`** and the API on **`api.*`**. Safari often ignores **`Set-Cookie`** from that cross-site **`fetch`**, so you get **204** but no usable session. The Next route proxies to FastAPI and **re-emits cookies on the app origin** so the browser keeps **`session_token`**. See **`docs/decisions/portless-local-development.md`** (Safari and session cookies).
 */
export function useDevAdminLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const response = await fetch(DEV_LOGIN_PROXY_PATH, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        await handleResponseError(response, 'Unable to use the dev admin login shortcut.');
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
  });
}
