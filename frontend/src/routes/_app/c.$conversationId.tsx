/**
 * Existing conversation page (`/c/:conversationId`).
 *
 * Replaces the previous server component that used `cookies()` +
 * server-side fetch.  Now hydrates client-side via TanStack Router's
 * route loader, which:
 *   - Runs before the component renders (parallel with `_app`'s auth
 *     probe) so we don't show a flash of empty state.
 *   - Throws to redirect on 401 (session expired) and falls through to
 *     a 404 boundary on missing conversation.
 *   - Returns the message history so {@link ChatContainer} hydrates
 *     without a separate fetch.
 */

import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import ChatContainer from '@/features/chat/ChatContainer';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/api';

export const Route = createFileRoute('/_app/c/$conversationId')({
	loader: async ({ params }) => {
		const { conversationId } = params;
		const response = await fetch(
			API_BASE_URL + API_ENDPOINTS.conversations.getMessages(conversationId),
			{
				method: 'GET',
				credentials: 'include',
				headers: { 'content-type': 'application/json' },
			},
		);
		if (response.status === 401) {
			throw redirect({ to: '/login' });
		}
		if (response.status === 404) {
			throw notFound();
		}
		if (!response.ok) {
			throw new Error(`Failed to fetch conversation messages: ${response.statusText}`);
		}
		const messages = await response.json();
		return { conversationId, messages };
	},
	component: ConversationRoute,
});

function ConversationRoute(): React.JSX.Element {
	const { conversationId, messages } = Route.useLoaderData();
	return (
		<ChatContainer
			key={conversationId}
			conversationId={conversationId}
			initialChatHistory={messages}
		/>
	);
}
