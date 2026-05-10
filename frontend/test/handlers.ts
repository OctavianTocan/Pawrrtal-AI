/**
 * Canonical MSW request handlers — the single source of truth for API shapes.
 *
 * Rule: every handler here must mirror the real FastAPI route contract.
 * When the backend route changes shape, update the handler *first*, then
 * fix the tests — the failing tests are the signal that a breaking change
 * has occurred.
 *
 * Usage
 * -----
 * Default handlers are wired into the MSW server automatically (see
 * `test/server.ts`).  Override a single handler per-test with:
 *
 *   server.use(
 *     http.get(`${API_BASE_URL}/api/v1/workspaces`, () =>
 *       HttpResponse.json({ detail: 'Forbidden' }, { status: 403 })
 *     )
 *   )
 *
 * The override is automatically reset after each test (see setup.ts).
 *
 * Adding handlers
 * ---------------
 * 1. Mirror the exact path from `lib/api.ts` (API_ENDPOINTS).
 * 2. Use realistic fixture shapes — copy them from backend schema tests.
 * 3. Export named fixtures alongside the handler so tests can reference
 *    exact values without duplicating the shape inline.
 */

import { HttpResponse, http } from 'msw';
import { API_BASE_URL } from '@/lib/api';

// ---------------------------------------------------------------------------
// Fixtures — exported so test files can reference canonical shapes without
// duplicating the object literal.
// ---------------------------------------------------------------------------

export const fixtures = {
	workspace: {
		id: 'ws-fixture-id',
		user_id: 'user-fixture-id',
		name: 'Main',
		slug: 'main',
		path: '/data/workspaces/user-fixture-id',
		is_default: true,
		created_at: '2026-01-01T00:00:00.000Z',
	},

	conversation: {
		id: 'conv-fixture-id',
		user_id: 'user-fixture-id',
		title: 'Test conversation',
		created_at: '2026-01-15T10:00:00.000Z',
		updated_at: '2026-01-15T10:00:00.000Z',
		is_archived: false,
		is_flagged: false,
		is_unread: false,
		status: null,
	},

	personalization: {
		name: '',
		custom_instructions: '',
		personality: 'balanced',
		memories_enabled: true,
		skip_tool_chats: false,
		remote_server_url: '',
	},

	workspaceEnv: {
		vars: {
			GEMINI_API_KEY: '',
			EXA_API_KEY: '',
			CLAUDE_CODE_OAUTH_TOKEN: '',
			XAI_API_KEY: '',
		},
	},

	models: [
		{ id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', provider: 'google' },
		{ id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: 'anthropic' },
	],
} as const;

// ---------------------------------------------------------------------------
// Default handlers — happy paths.  Tests override these per-scenario.
// ---------------------------------------------------------------------------

export const handlers = [
	// Health probe
	http.get(`${API_BASE_URL}/api/v1/health`, () => HttpResponse.json({ status: 'ok' })),

	// Workspaces
	http.get(`${API_BASE_URL}/api/v1/workspaces`, () => HttpResponse.json([fixtures.workspace])),

	// Workspace env overrides
	http.get(`${API_BASE_URL}/api/v1/workspace/env`, () =>
		HttpResponse.json(fixtures.workspaceEnv)
	),
	http.put(`${API_BASE_URL}/api/v1/workspace/env`, () =>
		HttpResponse.json(fixtures.workspaceEnv)
	),
	http.delete(
		`${API_BASE_URL}/api/v1/workspace/env/:key`,
		() => new HttpResponse(null, { status: 204 })
	),

	// Conversations
	http.get(`${API_BASE_URL}/api/v1/conversations`, () =>
		HttpResponse.json([fixtures.conversation])
	),
	http.post(`${API_BASE_URL}/api/v1/conversations/:id`, () =>
		HttpResponse.json(fixtures.conversation)
	),
	http.patch(`${API_BASE_URL}/api/v1/conversations/:id`, () =>
		HttpResponse.json(fixtures.conversation)
	),
	http.delete(
		`${API_BASE_URL}/api/v1/conversations/:id`,
		() => new HttpResponse(null, { status: 204 })
	),

	// Personalization
	http.get(`${API_BASE_URL}/api/v1/personalization`, () =>
		HttpResponse.json(fixtures.personalization)
	),
	http.put(`${API_BASE_URL}/api/v1/personalization`, () =>
		HttpResponse.json(fixtures.personalization)
	),

	// Models
	http.get(`${API_BASE_URL}/api/v1/models`, () => HttpResponse.json(fixtures.models)),

	// Channels (Telegram integration)
	http.get(`${API_BASE_URL}/api/v1/channels`, () => HttpResponse.json([])),
	http.post(`${API_BASE_URL}/api/v1/channels/telegram/link`, () =>
		HttpResponse.json({ ok: true })
	),
	http.delete(
		`${API_BASE_URL}/api/v1/channels/telegram/link`,
		() => new HttpResponse(null, { status: 204 })
	),
];
