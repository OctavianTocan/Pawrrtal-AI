import { cookies } from 'next/headers';
import { notFound, unauthorized } from 'next/navigation';
import ChatContainer from '@/features/chat/ChatContainer';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/api';

// Server components cannot use localStorage, so read the key from the build-time
// env var. In demo builds it is baked in; for production deployments configure
// NEXT_PUBLIC_BACKEND_API_KEY in the server's environment.
const SERVER_API_KEY = process.env.NEXT_PUBLIC_BACKEND_API_KEY ?? '';

/** Route params for `/c/:conversationId`. */
interface ConversationPageProps {
	params: Promise<{ conversationId: string }>;
}

/**
 * Existing conversation page (`/c/:conversationId`).
 *
 * Server-side fetches the message history for the given conversation and
 * hydrates {@link ChatContainer} with it. Returns 401/404 for unauthorized
 * or missing conversations.
 *
 * TODO: Extract a server-side authed fetch utility to reduce boilerplate.
 * TODO: Handle the case where a conversation was just created but has no messages yet.
 */
export default async function ConversationPage({ params }: ConversationPageProps) {
	// `params` and `cookies()` are independent — resolve in parallel rather
	// than awaiting sequentially. `Promise.all` collapses two ~µs awaits
	// into one but the pattern is the right shape for when either grows
	// (e.g., switching to a database-backed session).
	const [{ conversationId }, cookieStore] = await Promise.all([params, cookies()]);
	const sessionToken = cookieStore.get('session_token');

	const response = await fetch(
		API_BASE_URL + API_ENDPOINTS.conversations.getMessages(conversationId),
		{
			method: 'GET',
			headers: {
				'content-type': 'application/json',
				Cookie: `session_token=${sessionToken?.value}`,
				...(SERVER_API_KEY ? { 'X-Pawrrtal-Key': SERVER_API_KEY } : {}),
			},
		}
	);

	// Uses Next.js experimental authInterrupts feature.
	if (response.status === 401) {
		unauthorized();
	}
	if (response.status === 404) {
		notFound();
	}
	if (response.status === 500) {
		throw new Error('Internal server error');
	}

	// Ensures we catch any other non-OK responses that we didn't explicitly handle above.
	if (!response.ok) {
		throw new Error(`Failed to fetch conversation messages: ${response.statusText}`);
	}

	const messages = await response.json();

	return (
		<ChatContainer
			key={conversationId}
			conversationId={conversationId}
			initialChatHistory={messages}
		/>
	);
}
