/**
 * Next.js request middleware: session gate for protected app routes.
 *
 * @fileoverview Runs on matched paths (see {@link config.matcher}). Public auth pages bypass checks;
 *              other routes require the `session_token` cookie or redirect to `/login`.
 */

import { type NextRequest, NextResponse } from 'next/server';

/** Application roots that require an authenticated session. */
const protectedRoutes = ['/'];

/** Routes that must stay reachable without a session (sign-in flows). */
const publicRoutes = ['/login', '/signup'];

/** True when `path` is under any protected prefix. */
const isProtectedRoute = (path: string) => protectedRoutes.some((route) => path.startsWith(route));

/** True when `path` is exactly a public auth page. */
const isPublicRoute = (path: string) => publicRoutes.includes(path);

/**
 * Next.js middleware entrypoint: enforces cookie auth on protected paths.
 *
 * @param request - Incoming request (pathname + cookies).
 * @returns `NextResponse.next()` to continue, or a redirect to `/login` when unauthenticated.
 */
export function proxy(request: NextRequest) {
	const path = request.nextUrl.pathname;
	const sessionToken = request.cookies.get('session_token');

	if (isPublicRoute(path)) {
		return NextResponse.next();
	}

	if (isProtectedRoute(path) && !sessionToken) {
		return NextResponse.redirect(new URL('/login', request.url));
	}

	return NextResponse.next();
}

/** Limits middleware to page navigations; skips API, framework static
 * assets, favicon, and anything served from `frontend/public/` (matched
 * heuristically by trailing file extension — e.g. `theme-detection.js`,
 * `*.svg`, `*.png`).  Without the file-extension carve-out, every
 * `public/` asset request from a cold (no-cookie) client — like the
 * first visit to `/login` — gets redirected to `/login` itself,
 * returning an HTML body that the browser then tries to parse as JS
 * and chokes on ("SyntaxError: Unexpected token '<'"). */
export const config = {
	matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.+\\.[a-zA-Z0-9]+$).*)'],
};
