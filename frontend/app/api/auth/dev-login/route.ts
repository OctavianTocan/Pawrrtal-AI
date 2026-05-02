import { NextResponse } from 'next/server';

import { API_BASE_URL, API_ENDPOINTS } from '@/lib/api';

/**
 * Collect `Set-Cookie` header lines from an upstream fetch `Headers` object.
 * Prefers `Headers#getSetCookie` (Undici/Node) so multiple cookies parse correctly.
 */
function collectSetCookieHeaders(headers: Headers): string[] {
  const multi = headers.getSetCookie?.();
  if (multi !== undefined && multi.length > 0) {
    return multi;
  }
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

/**
 * Proxies `POST /auth/dev-login` to FastAPI and forwards `Set-Cookie` on the **same origin**
 * as the Next app (e.g. `https://app.nexus-ai.localhost`).
 *
 * Safari (and strict third-party cookie policies) often ignore cookies issued from a **cross-site**
 * response (`api.*` → user on `app.*`). Doing dev-login via this route stores the session cookie
 * for navigations and `credentials: 'include'` calls under the app host.
 */
export async function POST(): Promise<NextResponse> {
  // Proxy to FastAPI.
  const upstream = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.devLogin}`, {
    method: 'POST',
  });

  // Collect `Set-Cookie` headers from the upstream response. Which means the browser will store the cookie on the app host.
  const setCookies = collectSetCookieHeaders(upstream.headers);

  // Create a response object with the status and headers from the upstream response.
  const response =
    upstream.status === 204
      ? new NextResponse(null, { status: 204, statusText: upstream.statusText })
      : new NextResponse(await upstream.arrayBuffer(), {
          status: upstream.status,
          statusText: upstream.statusText,
          headers: forwardContentType(upstream.headers),
        });

  // Add the `Set-Cookie` headers to the response.
  for (const cookie of setCookies) {
    response.headers.append('Set-Cookie', cookie);
  }

  return response;
}

/**
 * Forward `Content-Type` when present so non-empty error bodies stay readable.
 */
function forwardContentType(headers: Headers): Record<string, string> | undefined {
  const contentType = headers.get('content-type');
  return contentType ? { 'content-type': contentType } : undefined;
}
