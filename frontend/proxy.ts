// proxy.ts
// The point of this file is to proxy requests to the backend.

import { type NextRequest, NextResponse } from 'next/server';

const protectedRoutes = ['/'];

const publicRoutes = ['/login', '/signup'];

/*
 * This function checks if the route is protected.
 */
const isProtectedRoute = (path: string) => protectedRoutes.some((route) => path.startsWith(route));

/*
 * This function checks if the route is public (auth pages).
 */
const isPublicRoute = (path: string) => publicRoutes.includes(path);

/*
 * This function proxies the request to the backend.
 */
export function proxy(request: NextRequest) {
  // Get the path of the request. (Presumably the browser is requesting this page.)
  const path = request.nextUrl.pathname;
  // Get the session token from the cookies. (HTTPOnly Cookie)
  const sessionToken = request.cookies.get('session_token');

  // Skip proxy for auth pages entirely - they should always be accessible
  if (isPublicRoute(path)) {
    return NextResponse.next();
  }

  // If the route is protected and the user is not authenticated, redirect to the login page.
  if (isProtectedRoute(path) && !sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Allow the request to continue
  return NextResponse.next();
}

/*
 * This is the configuration for the proxy middleware.
 * It matches all routes except the API routes, static files, and images.
 */
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
