/**
 * MSW server for Vitest (Node environment).
 *
 * Import and re-export `server` in test files that need per-test handler
 * overrides.  The global lifecycle (start / reset / close) is wired in
 * `test/setup.ts`, so you never call `server.listen()` in a test file.
 *
 * Per-test override pattern:
 *
 *   import { server } from '@/test/server';
 *   import { http, HttpResponse } from 'msw';
 *
 *   it('handles 401', async () => {
 *     server.use(
 *       http.get('http://localhost:8000/api/v1/workspaces', () =>
 *         HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
 *       )
 *     );
 *     // … render + assert
 *   });
 *
 * The override is automatically reset after each test because setup.ts
 * calls `server.resetHandlers()` in `afterEach`.
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
