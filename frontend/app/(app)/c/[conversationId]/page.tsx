import { cookies } from "next/headers";
import { notFound, unauthorized } from "next/navigation";
import ChatContainer from "@/features/chat/ChatContainer";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/api";

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
export default async function ConversationPage({
	params,
}: ConversationPageProps) {
	const { conversationId } = await params;
	const cookieStore = await cookies();
	const sessionToken = cookieStore.get("session_token");

	const response = await fetch(
		API_BASE_URL + API_ENDPOINTS.conversations.getMessages(conversationId),
		{
			method: "GET",
			headers: {
				"content-type": "application/json",
				Cookie: `session_token=${sessionToken?.value}`,
			},
		},
	);

	// Uses Next.js experimental authInterrupts feature.
	if (response.status === 401) {
		unauthorized();
	}
	if (response.status === 404) {
		notFound();
	}
	if (response.status === 500) {
		throw new Error("Internal server error");
	}

	const messages = await response.json();

	return (
		<div>
			<h1 className="flex-1 items-center text-center">
				Conversation {conversationId}
			</h1>
			<ChatContainer
				key={conversationId}
				conversationId={conversationId}
				initialChatHistory={messages}
			/>
		</div>
	);
}
