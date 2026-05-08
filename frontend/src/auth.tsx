/**
 * Authentication state surface for the SPA.
 *
 * Pattern follows TanStack Router's official auth-and-guards skill:
 *   - `AuthProvider` owns the auth state + login/logout helpers.
 *   - `useAuth()` reads it inside React.
 *   - The router consumes it via `createRootRouteWithContext<{ auth }>`
 *     so route-level `beforeLoad` guards can check auth without going
 *     through a hook (which is forbidden outside React).
 *
 * Auth model: backend issues an httpOnly `session_token` cookie at
 * `POST /auth/jwt/login` (fastapi-users) and accepts it on subsequent
 * requests via `credentials: 'include'`.  The cookie is invisible to
 * JS, so we infer auth state by hitting a cheap authed endpoint
 * (`GET /api/v1/conversations`) once on mount and caching the result.
 *
 * The `isLoading` flag lets the provider gate first paint behind the
 * auth probe, so a protected route doesn't flash unauthenticated UI
 * before the redirect happens.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/api';

export interface AuthState {
	isAuthenticated: boolean;
	isLoading: boolean;
	logout: () => Promise<void>;
	/**
	 * Manually mark the session as authenticated.  Login flows
	 * (`features/auth/LoginForm`) call this after the backend's
	 * login endpoint succeeds so we don't re-probe.
	 */
	markAuthenticated: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		// Probe a cheap authed endpoint to decide whether the cookie
		// is still valid.  401 means we need to log in; anything else
		// (200, network error, etc.) means we treat the session as
		// usable and let the actual API call surface the error.
		(async () => {
			try {
				const res = await fetch(API_BASE_URL + API_ENDPOINTS.conversations.list, {
					method: 'GET',
					credentials: 'include',
				});
				if (cancelled) return;
				setIsAuthenticated(res.status !== 401);
			} catch {
				if (cancelled) return;
				// Network errors during the probe shouldn't lock the user
				// out; treat as unauthenticated so the login route is
				// reachable instead of an infinite loading state.
				setIsAuthenticated(false);
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const logout = useCallback(async (): Promise<void> => {
		await fetch(`${API_BASE_URL}/auth/jwt/logout`, {
			method: 'POST',
			credentials: 'include',
		});
		setIsAuthenticated(false);
	}, []);

	const markAuthenticated = useCallback((): void => {
		setIsAuthenticated(true);
	}, []);

	const value = useMemo<AuthState>(
		() => ({ isAuthenticated, isLoading, logout, markAuthenticated }),
		[isAuthenticated, isLoading, logout, markAuthenticated]
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Returns the auth state.  Throws if called outside `<AuthProvider>`.
 */
export function useAuth(): AuthState {
	const ctx = useContext(AuthContext);
	if (ctx === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return ctx;
}
