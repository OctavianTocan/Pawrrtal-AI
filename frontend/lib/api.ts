/**
 * Base URL for all API requests.
 * Determined from NEXT_PUBLIC_API_URL environment variable.
 *
 * Default targets the local FastAPI dev server on `http://localhost:8000`.
 * In production (Vercel) the env var must be set to the deployed API origin.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

/**
 * API endpoint definitions for frontend requests.
 * Organized by logical service areas. Use curried functions for endpoints with path params,
 * and plain string properties for static endpoints.
 */
export const API_ENDPOINTS = {
	/** Endpoints related to chat functionality */
	chat: {
		/**
		 * Chat streaming endpoint.
		 * @returns `/api/v1/chat`
		 */
		messages: '/api/v1/chat',
		models: '/api/v1/models',
	},
	/** Endpoints for conversation management */
	conversations: {
		/**
		 * Get an individual conversation by ID.
		 * @param id - Conversation ID
		 * @returns `/api/v1/conversations/${id}`
		 */
		get: (id: string) => `/api/v1/conversations/${id}`,
		/**
		 * Get the messages for a conversation by ID.
		 * @param id - Conversation ID
		 * @returns `/api/v1/conversations/${id}/messages`
		 */
		getMessages: (id: string) => `/api/v1/conversations/${id}/messages`,
		/**
		 * Create a conversation.
		 * @returns `/api/v1/conversations`
		 */
		create: (id: string) => `/api/v1/conversations/${id}`,
		/**
		 * Update conversation metadata.
		 * @param id - Conversation ID
		 * @returns `/api/v1/conversations/${id}`
		 */
		update: (id: string) => `/api/v1/conversations/${id}`,
		/**
		 * Delete a conversation.
		 * @param id - Conversation ID
		 * @returns `/api/v1/conversations/${id}`
		 */
		delete: (id: string) => `/api/v1/conversations/${id}`,
		list: '/api/v1/conversations',
		/**
		 * Generate a conversation title.
		 * @param id - Conversation ID
		 * @returns `/api/v1/conversations/${id}/title`
		 */
		generateTitle: (id: string, firstMessage: string) =>
			`/api/v1/conversations/${id}/title?first_message=${encodeURIComponent(firstMessage)}`,
	},
	/** Endpoints for authentication actions */
	auth: {
		/**
		 * Login endpoint.
		 * @returns `/auth/jwt/login`
		 */
		login: '/auth/jwt/login',
		/**
		 * Dev-only admin login shortcut.
		 * @returns `/auth/dev-login`
		 */
		devLogin: '/auth/dev-login',
		/**
		 * Register endpoint.
		 * @returns `/auth/register`
		 */
		register: '/auth/register',
		/**
		 * Logout endpoint.
		 * @returns `/auth/logout`
		 */
		logout: '/auth/logout',
		/**
		 * Get current user info.
		 * @returns `/me`
		 */
		me: '/me',
	},
	/** Endpoints related to user management */
	users: {
		/**
		 * Get all users.
		 * @returns `/users`
		 */
		get: '/users',
	},
	/** Endpoints for session management */
	session: {
		/**
		 * Get session info.
		 * @returns `/session`
		 */
		get: '/session',
	},
	/** Endpoints for token management */
	token: {
		/**
		 * Get token info.
		 * @returns `/token`
		 */
		get: '/token',
	},
	/** Speech-to-text proxy endpoints (xAI behind the backend). */
	stt: {
		/**
		 * Transcribe an uploaded audio blob via the xAI STT proxy.
		 * @returns `/api/v1/stt`
		 */
		transcribe: '/api/v1/stt',
	},
	/** Project (sidebar grouping) endpoints. */
	projects: {
		/**
		 * List every project owned by the user.
		 * @returns `/api/v1/projects`
		 */
		list: '/api/v1/projects',
		/** Create a new project. */
		create: '/api/v1/projects',
		/**
		 * Update (rename) a project by ID.
		 * @param id - Project ID
		 */
		update: (id: string) => `/api/v1/projects/${id}`,
		/**
		 * Delete a project by ID. Linked conversations are unlinked, not deleted.
		 * @param id - Project ID
		 */
		delete: (id: string) => `/api/v1/projects/${id}`,
	},
} as const;
