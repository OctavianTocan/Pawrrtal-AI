/**
 * Base URL for all API requests.
 * Determined from NEXT_PUBLIC_API_URL environment variable.
 *
 * Default matches Portless routing (`dev.ts` / `just dev`): the UI is served over HTTPS at
 * app.nexus-ai.localhost, so the API must use HTTPS too — otherwise the browser blocks mixed
 * content. For plain `next dev` on http://localhost without Portless, set
 * NEXT_PUBLIC_API_URL=http://localhost:8000 in `.env.local`.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.app.nexus-ai.localhost';

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
     * @returns `/api/chat`
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
      `/api/v1/conversations/${id}/title?first_message=${firstMessage}`,
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
} as const;
