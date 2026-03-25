import ChatContainer from "@/features/chat/ChatContainer";

/**
 * Root conversation page (`/`).
 *
 * Generates a fresh UUID on each render so the {@link ChatContainer} starts
 * with a blank slate. The `key` prop ensures React fully remounts the
 * component when navigating back here from an existing conversation.
 */
export default async function ConversationPage() {
	const uuid: string = crypto.randomUUID();

	return (
		<div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col">
			<ChatContainer key={uuid} conversationId={uuid} />
		</div>
	);
}
